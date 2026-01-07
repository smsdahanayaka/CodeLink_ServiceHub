// ===========================================
// Collection Item Receive API - Receive individual item
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

// Generate unique warranty card number
async function generateCardNumber(tenantId: number): Promise<string> {
  const prefix = "WC";
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const count = await prisma.warrantyCard.count({
    where: {
      tenantId,
      createdAt: { gte: startOfDay },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${day}${sequence}`;
}

// Generate unique claim number
async function generateClaimNumber(tenantId: number): Promise<string> {
  const prefix = "CL";
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const count = await prisma.warrantyClaim.count({
    where: {
      tenantId,
      createdAt: { gte: startOfDay },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${day}${sequence}`;
}

// POST /api/logistics/collection-trips/[id]/items/[itemId]/receive - Receive single item
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id, itemId } = await params;
    const tripId = parseInt(id);
    const collectionItemId = parseInt(itemId);

    if (isNaN(tripId) || isNaN(collectionItemId)) {
      return errorResponse("Invalid ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.receive")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { action, rejectionReason, notes } = body;

    if (!action || !["receive", "reject"].includes(action)) {
      return errorResponse("Invalid action. Must be 'receive' or 'reject'", "INVALID_ACTION", 400);
    }

    // Get trip and item
    const trip = await prisma.collectionTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
      include: {
        shop: true,
        collector: true,
      },
    });

    if (!trip) {
      return errorResponse("Collection trip not found", "NOT_FOUND", 404);
    }

    // Trip must be IN_TRANSIT
    if (trip.status !== "IN_TRANSIT") {
      return errorResponse("Trip must be in transit to receive items", "INVALID_STATUS", 400);
    }

    // Get the specific item
    const item = await prisma.collectionItem.findFirst({
      where: {
        id: collectionItemId,
        tripId: tripId,
      },
      include: {
        warrantyCard: {
          include: {
            product: true,
            customer: true,
            shop: true,
          },
        },
        product: true,
        claim: true,
      },
    });

    if (!item) {
      return errorResponse("Collection item not found", "NOT_FOUND", 404);
    }

    // Item must be in COLLECTED status
    if (item.status !== "COLLECTED") {
      return errorResponse(`Item already ${item.status.toLowerCase()}`, "ALREADY_PROCESSED", 400);
    }

    if (action === "reject") {
      if (!rejectionReason) {
        return errorResponse("Rejection reason is required", "REASON_REQUIRED", 400);
      }

      // Update item status
      await prisma.collectionItem.update({
        where: { id: collectionItemId },
        data: {
          status: "REJECTED",
          notes: `Rejected: ${rejectionReason}${notes ? `. Notes: ${notes}` : ""}`,
        },
      });

      // Create a delivery for rejected item
      const deliveryNumber = `DL${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${new Date().getDate().toString().padStart(2, "0")}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // We need a claim to create a delivery, so first create a rejected claim
      const claimNumber = await generateClaimNumber(user.tenantId);

      // Create warranty card if needed
      let warrantyCardId = item.warrantyCardId;
      if (!warrantyCardId && item.productId) {
        // Get shopId or create a default shop for direct customers
        let shopId = trip.shopId;
        if (!shopId) {
          let directShop = await prisma.shop.findFirst({
            where: { tenantId: user.tenantId, code: "DIRECT" },
          });
          if (!directShop) {
            directShop = await prisma.shop.create({
              data: {
                tenantId: user.tenantId,
                code: "DIRECT",
                name: "Direct Customer",
                status: "ACTIVE",
                isVerified: true,
                notes: "Auto-created for direct customer collections",
              },
            });
          }
          shopId = directShop.id;
        }

        const cardNumber = await generateCardNumber(user.tenantId);
        const product = item.product || await prisma.product.findUnique({ where: { id: item.productId } });

        const warrantyEndDate = new Date();
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + (product?.warrantyPeriodMonths || 12));

        const newCard = await prisma.warrantyCard.create({
          data: {
            tenantId: user.tenantId,
            cardNumber,
            productId: item.productId,
            shopId: shopId,
            serialNumber: item.serialNumber,
            purchaseDate: new Date(),
            warrantyStartDate: new Date(),
            warrantyEndDate,
            status: "ACTIVE",
            notes: `Auto-created for rejected collection item from trip ${trip.tripNumber}`,
            createdBy: user.id,
          },
        });
        warrantyCardId = newCard.id;

        // Update item with warranty card
        await prisma.collectionItem.update({
          where: { id: collectionItemId },
          data: { warrantyCardId },
        });
      }

      if (warrantyCardId) {
        // Create a rejected claim
        const rejectedClaim = await prisma.warrantyClaim.create({
          data: {
            tenantId: user.tenantId,
            claimNumber,
            warrantyCardId,
            issueDescription: item.issueDescription,
            reportedBy: trip.fromType === "SHOP" ? "SHOP" : "CUSTOMER",
            priority: "MEDIUM",
            currentStatus: "rejected",
            currentLocation: "SERVICE_CENTER",
            acceptanceStatus: "REJECTED",
            receivedAt: new Date(),
            createdBy: user.id,
          },
        });

        // Update item with claim
        await prisma.collectionItem.update({
          where: { id: collectionItemId },
          data: { claimId: rejectedClaim.id },
        });

        // Create claim history
        await prisma.claimHistory.create({
          data: {
            claimId: rejectedClaim.id,
            toStatus: "rejected",
            toLocation: "SERVICE_CENTER",
            actionType: "item_rejected",
            performedBy: user.id,
            notes: `Item rejected at receiving: ${rejectionReason}`,
            metadata: {
              collectionTripId: trip.id,
              collectionTripNumber: trip.tripNumber,
              itemId: item.id,
            },
          },
        });

        // Create delivery for return
        await prisma.delivery.create({
          data: {
            tenantId: user.tenantId,
            claimId: rejectedClaim.id,
            deliveryNumber,
            fromLocation: "Service Center",
            toType: trip.fromType === "SHOP" ? "SHOP" : "CUSTOMER",
            toShopId: trip.shopId,
            toAddress: trip.customerAddress,
            status: "PENDING",
            notes: `Return delivery for rejected item: ${rejectionReason}`,
          },
        });
      }

      // Check if all items are processed
      const remainingItems = await prisma.collectionItem.count({
        where: {
          tripId,
          status: "COLLECTED",
        },
      });

      // If no more items to process, mark trip as RECEIVED
      if (remainingItems === 0) {
        await prisma.collectionTrip.update({
          where: { id: tripId },
          data: {
            status: "RECEIVED",
            receivedAt: new Date(),
            receivedBy: user.id,
          },
        });
      }

      return successResponse({
        action: "rejected",
        itemId: collectionItemId,
        message: "Item rejected and return delivery created",
      });
    }

    // Action is "receive" - create claim
    let warrantyCardId = item.warrantyCardId;

    // If no warranty card, try to create one
    if (!warrantyCardId) {
      if (!item.productId) {
        return errorResponse("Product is required to receive item", "PRODUCT_REQUIRED", 400);
      }

      // Get shopId from trip or find/create a default shop for direct customers
      let shopId = trip.shopId;

      if (!shopId) {
        // For direct customer collections, find or create a "Direct Customer" shop
        let directShop = await prisma.shop.findFirst({
          where: {
            tenantId: user.tenantId,
            code: "DIRECT",
          },
        });

        if (!directShop) {
          // Create a default shop for direct customer collections
          directShop = await prisma.shop.create({
            data: {
              tenantId: user.tenantId,
              code: "DIRECT",
              name: "Direct Customer",
              status: "ACTIVE",
              isVerified: true,
              notes: "Auto-created for direct customer collections",
            },
          });
        }
        shopId = directShop.id;
      }

      const product = item.product || await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return errorResponse("Product not found", "PRODUCT_NOT_FOUND", 400);
      }

      const cardNumber = await generateCardNumber(user.tenantId);
      const warrantyEndDate = new Date();
      warrantyEndDate.setMonth(warrantyEndDate.getMonth() + product.warrantyPeriodMonths);

      const newCard = await prisma.warrantyCard.create({
        data: {
          tenantId: user.tenantId,
          cardNumber,
          productId: item.productId,
          shopId: shopId,
          serialNumber: item.serialNumber,
          purchaseDate: new Date(),
          warrantyStartDate: new Date(),
          warrantyEndDate,
          status: "ACTIVE",
          notes: `Auto-registered from collection trip ${trip.tripNumber}. Customer: ${item.customerName || trip.customerName || "N/A"}`,
          createdBy: user.id,
        },
      });

      warrantyCardId = newCard.id;
    }

    // Get default workflow
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

    // Create claim
    const claimNumber = await generateClaimNumber(user.tenantId);
    const claim = await prisma.warrantyClaim.create({
      data: {
        tenantId: user.tenantId,
        claimNumber,
        warrantyCardId,
        workflowId: defaultWorkflow?.id || null,
        currentStepId: defaultWorkflow?.steps[0]?.id || null,
        currentStepStartedAt: defaultWorkflow ? new Date() : null,
        issueDescription: item.issueDescription,
        reportedBy: trip.fromType === "SHOP" ? "SHOP" : "CUSTOMER",
        priority: "MEDIUM",
        currentStatus: defaultWorkflow?.steps[0]?.statusName || "new",
        currentLocation: "SERVICE_CENTER",
        acceptanceStatus: "ACCEPTED",
        receivedAt: new Date(),
        acceptedAt: new Date(),
        acceptedBy: user.id,
        createdBy: user.id,
      },
      include: {
        warrantyCard: {
          include: {
            product: true,
            customer: true,
            shop: true,
          },
        },
      },
    });

    // Update collection item
    await prisma.collectionItem.update({
      where: { id: collectionItemId },
      data: {
        warrantyCardId,
        claimId: claim.id,
        status: "RECEIVED",
        notes: notes || null,
      },
    });

    // Create claim history
    await prisma.claimHistory.create({
      data: {
        claimId: claim.id,
        workflowStepId: defaultWorkflow?.steps[0]?.id || null,
        toStatus: claim.currentStatus,
        toLocation: "SERVICE_CENTER",
        actionType: "claim_created",
        performedBy: user.id,
        notes: `Claim created from collection trip ${trip.tripNumber}`,
        metadata: {
          collectionTripId: trip.id,
          collectionTripNumber: trip.tripNumber,
          itemId: item.id,
        },
      },
    });

    // Check if all items are processed
    const remainingItems = await prisma.collectionItem.count({
      where: {
        tripId,
        status: "COLLECTED",
      },
    });

    // If no more items to process, mark trip as RECEIVED
    if (remainingItems === 0) {
      await prisma.collectionTrip.update({
        where: { id: tripId },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          receivedBy: user.id,
        },
      });
    }

    return successResponse({
      action: "received",
      itemId: collectionItemId,
      claim: {
        id: claim.id,
        claimNumber: claim.claimNumber,
        currentStatus: claim.currentStatus,
      },
      warrantyCard: {
        id: claim.warrantyCard.id,
        cardNumber: claim.warrantyCard.cardNumber,
        status: claim.warrantyCard.status,
        warrantyEndDate: claim.warrantyCard.warrantyEndDate,
        isExpired: new Date() > claim.warrantyCard.warrantyEndDate,
      },
      message: "Item received and claim created",
    });
  } catch (error) {
    console.error("Error receiving collection item:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to receive item", "SERVER_ERROR", 500);
  }
}
