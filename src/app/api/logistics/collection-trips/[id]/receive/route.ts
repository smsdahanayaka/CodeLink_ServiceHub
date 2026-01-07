// ===========================================
// Collection Trip Receive API - Receive at Service Center
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";
import { v4 as uuidv4 } from "uuid";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Generate unique warranty card number
async function generateCardNumber(tenantId: number): Promise<string> {
  const prefix = "WC";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.warrantyCard.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${sequence}`;
}

// Generate unique claim number
async function generateClaimNumber(tenantId: number): Promise<string> {
  const prefix = "CL";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.warrantyClaim.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${sequence}`;
}

// POST /api/logistics/collection-trips/[id]/receive - Receive trip at service center
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return errorResponse("Invalid trip ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.receive")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { notes } = body;

    // Get existing trip with items and linked pickups
    const existingTrip = await prisma.collectionTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
      include: {
        shop: true,
        collector: true,
        items: {
          include: {
            warrantyCard: {
              include: {
                product: true,
                customer: true,
                shop: true,
              },
            },
            product: true,
          },
        },
        pickups: {
          include: {
            claim: true,
          },
        },
      },
    });

    if (!existingTrip) {
      return errorResponse("Collection trip not found", "NOT_FOUND", 404);
    }

    // Can only receive trips that are IN_TRANSIT
    if (existingTrip.status !== "IN_TRANSIT") {
      return errorResponse("Trip must be in transit to receive", "INVALID_STATUS", 400);
    }

    if (existingTrip.items.length === 0) {
      return errorResponse("Cannot receive empty trip", "NO_ITEMS", 400);
    }

    // Get default workflow for auto-assignment
    const defaultWorkflow = await prisma.workflow.findFirst({
      where: {
        tenantId: user.tenantId,
        isDefault: true,
        isActive: true,
      },
      include: {
        steps: {
          where: { stepType: "START" },
          orderBy: { stepOrder: "asc" },
          take: 1,
        },
      },
    });

    const processedItems: Array<{
      itemId: number;
      serialNumber: string;
      warrantyCardId: number | null;
      claimId: number | null;
      status: string;
      message: string;
    }> = [];

    // Process each item
    for (const item of existingTrip.items) {
      try {
        let warrantyCardId = item.warrantyCardId;
        let claimId = item.claimId;

        // If item doesn't have a warranty card, create one
        if (!warrantyCardId) {
          // Must have product ID for unregistered items
          const productId = item.productId;
          if (!productId) {
            processedItems.push({
              itemId: item.id,
              serialNumber: item.serialNumber,
              warrantyCardId: null,
              claimId: null,
              status: "SKIPPED",
              message: "No product specified for unregistered item",
            });
            continue;
          }

          // Get product for warranty period
          const product = item.product || await prisma.product.findUnique({
            where: { id: productId },
          });

          if (!product) {
            processedItems.push({
              itemId: item.id,
              serialNumber: item.serialNumber,
              warrantyCardId: null,
              claimId: null,
              status: "SKIPPED",
              message: "Product not found",
            });
            continue;
          }

          // Calculate warranty dates
          const purchaseDate = new Date();
          const warrantyStartDate = new Date();
          const warrantyEndDate = new Date();
          warrantyEndDate.setMonth(warrantyEndDate.getMonth() + product.warrantyPeriodMonths);

          // Generate card number
          const cardNumber = await generateCardNumber(user.tenantId);

          // Create warranty card (using shop info if no customer details)
          const newWarrantyCard = await prisma.warrantyCard.create({
            data: {
              tenantId: user.tenantId,
              cardNumber,
              productId,
              shopId: existingTrip.shopId || (existingTrip.shop?.id as number),
              customerId: null, // Will be null if no customer details
              serialNumber: item.serialNumber,
              purchaseDate,
              warrantyStartDate,
              warrantyEndDate,
              status: "ACTIVE",
              notes: `Auto-registered from collection trip ${existingTrip.tripNumber}. Customer: ${item.customerName || existingTrip.customerName || "N/A"}, Phone: ${item.customerPhone || existingTrip.customerPhone || "N/A"}`,
              createdBy: user.id,
            },
          });

          warrantyCardId = newWarrantyCard.id;
        }

        // Create claim for this item with PENDING acceptance status
        const claimNumber = await generateClaimNumber(user.tenantId);

        const newClaim = await prisma.warrantyClaim.create({
          data: {
            tenantId: user.tenantId,
            claimNumber,
            warrantyCardId: warrantyCardId as number,
            workflowId: defaultWorkflow?.id || null,
            currentStepId: defaultWorkflow?.steps[0]?.id || null,
            currentStepStartedAt: defaultWorkflow ? new Date() : null,
            issueDescription: item.issueDescription,
            reportedBy: existingTrip.fromType === "SHOP" ? "SHOP" : "CUSTOMER",
            priority: "MEDIUM",
            currentStatus: "pending_acceptance", // Set to pending acceptance instead of workflow step
            currentLocation: "SERVICE_CENTER",
            acceptanceStatus: "PENDING", // Needs to be reviewed and accepted
            receivedAt: new Date(),
            createdBy: user.id,
          },
        });

        claimId = newClaim.id;

        // Record claim history
        await prisma.claimHistory.create({
          data: {
            claimId: newClaim.id,
            toStatus: newClaim.currentStatus,
            toLocation: "SERVICE_CENTER",
            actionType: "claim_created",
            performedBy: user.id,
            notes: `Claim created from collection trip ${existingTrip.tripNumber}`,
            metadata: {
              collectionTripId: existingTrip.id,
              collectionTripNumber: existingTrip.tripNumber,
              itemId: item.id,
            },
          },
        });

        // Update collection item
        await prisma.collectionItem.update({
          where: { id: item.id },
          data: {
            warrantyCardId,
            claimId,
            status: "PROCESSED",
          },
        });

        processedItems.push({
          itemId: item.id,
          serialNumber: item.serialNumber,
          warrantyCardId,
          claimId,
          status: "PROCESSED",
          message: "Successfully processed",
        });
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        processedItems.push({
          itemId: item.id,
          serialNumber: item.serialNumber,
          warrantyCardId: item.warrantyCardId,
          claimId: item.claimId,
          status: "ERROR",
          message: itemError instanceof Error ? itemError.message : "Unknown error",
        });
      }
    }

    // Update linked pickups status to COMPLETED and their claims
    for (const pickup of existingTrip.pickups) {
      await prisma.pickup.update({
        where: { id: pickup.id },
        data: {
          status: "COMPLETED",
          receivedAt: new Date(),
          receiverName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        },
      });

      // Update the claim from pickup - already has warranty card, so just update location and acceptance
      if (pickup.claim && pickup.claimId) {
        await prisma.warrantyClaim.update({
          where: { id: pickup.claimId },
          data: {
            currentLocation: "SERVICE_CENTER",
            acceptanceStatus: "PENDING", // From scheduled pickup also needs acceptance review
            currentStatus: "pending_acceptance",
            receivedAt: new Date(),
          },
        });

        // Record in claim history
        await prisma.claimHistory.create({
          data: {
            claimId: pickup.claimId,
            fromStatus: pickup.claim.currentStatus,
            toStatus: "pending_acceptance",
            toLocation: "SERVICE_CENTER",
            actionType: "pickup_received",
            performedBy: user.id,
            notes: `Received via collection trip ${existingTrip.tripNumber}`,
            metadata: {
              collectionTripId: existingTrip.id,
              collectionTripNumber: existingTrip.tripNumber,
              pickupId: pickup.id,
              pickupNumber: pickup.pickupNumber,
            },
          },
        });
      }
    }

    // Update trip status
    const trip = await prisma.collectionTrip.update({
      where: { id: tripId },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
        receivedBy: user.id,
        notes: notes ? `${existingTrip.notes || ""}\n\nReceive notes: ${notes}`.trim() : existingTrip.notes,
      },
      include: {
        collector: {
          select: { id: true, name: true, phone: true },
        },
        shop: {
          select: { id: true, name: true, address: true },
        },
        receiverUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            warrantyCard: {
              select: {
                id: true,
                cardNumber: true,
                product: { select: { name: true } },
              },
            },
            claim: {
              select: { id: true, claimNumber: true, currentStatus: true },
            },
          },
        },
      },
    });

    const successCount = processedItems.filter(i => i.status === "PROCESSED").length;
    const errorCount = processedItems.filter(i => i.status === "ERROR").length;
    const skippedCount = processedItems.filter(i => i.status === "SKIPPED").length;

    return successResponse({
      trip,
      summary: {
        total: processedItems.length,
        processed: successCount,
        errors: errorCount,
        skipped: skippedCount,
      },
      items: processedItems,
    });
  } catch (error) {
    console.error("Error receiving collection trip:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to receive collection trip", "SERVER_ERROR", 500);
  }
}
