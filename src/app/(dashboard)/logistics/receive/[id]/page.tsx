"use client";

// ===========================================
// Receive Collection Trip Page
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Truck,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  PackageCheck,
  FileText,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface CollectionItem {
  id: number;
  serialNumber: string;
  issueDescription: string;
  status: "COLLECTED" | "RECEIVED" | "PROCESSED";
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  warrantyCard: {
    id: number;
    cardNumber: string;
    product: { name: string };
  } | null;
  product: {
    id: number;
    name: string;
  } | null;
  claim: {
    id: number;
    claimNumber: string;
    currentStatus: string;
  } | null;
}

interface CollectionTrip {
  id: number;
  tripNumber: string;
  fromType: "SHOP" | "CUSTOMER";
  status: "IN_PROGRESS" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  startedAt: string;
  completedAt: string | null;
  receivedAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  notes: string | null;
  collector: {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    vehicleNumber: string | null;
    vehicleType: string | null;
  };
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    contactPerson: string | null;
  } | null;
  receiverUser: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  items: CollectionItem[];
}

interface ReceiveResult {
  trip: CollectionTrip;
  summary: {
    total: number;
    processed: number;
    errors: number;
    skipped: number;
  };
  items: Array<{
    itemId: number;
    serialNumber: string;
    warrantyCardId: number | null;
    claimId: number | null;
    status: string;
    message: string;
  }>;
}

export default function ReceiveTripPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<CollectionTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveResult, setReceiveResult] = useState<ReceiveResult | null>(null);

  useEffect(() => {
    fetchTrip();
  }, [resolvedParams.id]);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/logistics/collection-trips/${resolvedParams.id}`);
      const data = await res.json();

      if (data.success) {
        setTrip(data.data);
      } else {
        toast.error(data.error?.message || "Failed to load trip");
        router.push("/logistics/collection-trips");
      }
    } catch (error) {
      console.error("Error fetching trip:", error);
      toast.error("Failed to load trip");
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!trip) return;

    setReceiving(true);
    try {
      const res = await fetch(`/api/logistics/collection-trips/${trip.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: receiveNotes }),
      });

      const data = await res.json();

      if (data.success) {
        setReceiveResult(data.data);
        toast.success(`Trip received! ${data.data.summary.processed} items processed.`);
      } else {
        toast.error(data.error?.message || "Failed to receive trip");
      }
    } catch (error) {
      console.error("Error receiving trip:", error);
      toast.error("Failed to receive trip");
    } finally {
      setReceiving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Trip not found</p>
        <Button variant="link" onClick={() => router.push("/logistics/collection-trips")}>
          Back to Collection Trips
        </Button>
      </div>
    );
  }

  // If already received, show the result
  if (receiveResult || trip.status === "RECEIVED") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/logistics/collection-trips")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader
            title={`Trip ${trip.tripNumber} Received`}
            description="All items have been processed"
          />
        </div>

        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800">Trip Received Successfully</AlertTitle>
          <AlertDescription className="text-green-700">
            {receiveResult ? (
              <>
                {receiveResult.summary.processed} of {receiveResult.summary.total} items processed.
                {receiveResult.summary.errors > 0 && ` ${receiveResult.summary.errors} errors.`}
                {receiveResult.summary.skipped > 0 && ` ${receiveResult.summary.skipped} skipped.`}
              </>
            ) : (
              `Received at ${trip.receivedAt ? formatDate(trip.receivedAt) : "N/A"}`
            )}
          </AlertDescription>
        </Alert>

        {receiveResult && (
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
              <CardDescription>Details of each item processed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {receiveResult.items.map((item) => (
                  <div
                    key={item.itemId}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      item.status === "PROCESSED"
                        ? "bg-green-50 border-green-200"
                        : item.status === "ERROR"
                        ? "bg-red-50 border-red-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{item.serialNumber}</p>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                    </div>
                    <div className="text-right">
                      {item.claimId && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => router.push(`/claims/${item.claimId}`)}
                        >
                          View Claim
                        </Button>
                      )}
                      <Badge
                        variant={
                          item.status === "PROCESSED"
                            ? "default"
                            : item.status === "ERROR"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button onClick={() => router.push("/logistics/collection-trips")}>
            Back to Collection Trips
          </Button>
          <Button variant="outline" onClick={() => router.push("/claims")}>
            View All Claims
          </Button>
        </div>
      </div>
    );
  }

  // Trip must be IN_TRANSIT to receive
  if (trip.status !== "IN_TRANSIT") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/logistics/collection-trips")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader title={`Trip ${trip.tripNumber}`} />
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Cannot Receive This Trip</AlertTitle>
          <AlertDescription>
            This trip has status "{trip.status}" and cannot be received. Only trips that are "In Transit" can be received.
          </AlertDescription>
        </Alert>

        <Button variant="outline" onClick={() => router.push("/logistics/collection-trips")}>
          Back to Collection Trips
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/logistics/collection-trips")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={`Receive Trip ${trip.tripNumber}`}
          description="Review items and confirm receipt at service center"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Items to Receive</CardTitle>
                  <CardDescription>{trip.items.length} items in this trip</CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {trip.items.length} Items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trip.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          <Badge variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {item.serialNumber}
                          </Badge>
                        </div>
                        <p className="font-medium">
                          {item.warrantyCard?.product.name || item.product?.name || "Unknown Product"}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.issueDescription}</p>

                        {item.warrantyCard ? (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Warranty Card: {item.warrantyCard.cardNumber}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-yellow-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>No warranty card - will be auto-registered</span>
                          </div>
                        )}

                        {(item.customerName || item.customerPhone) && (
                          <div className="text-sm text-muted-foreground">
                            Customer: {item.customerName || "N/A"} | {item.customerPhone || "N/A"}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={
                          item.status === "COLLECTED" ? "secondary" :
                          item.status === "RECEIVED" ? "default" : "default"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trip Info & Actions */}
        <div className="space-y-4">
          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{trip.collector.name}</p>
                  <p className="text-sm text-muted-foreground">Collector</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{trip.collector.phone}</p>
                  <p className="text-sm text-muted-foreground">Phone</p>
                </div>
              </div>
              {trip.collector.vehicleNumber && (
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{trip.collector.vehicleNumber}</p>
                    <p className="text-sm text-muted-foreground">Vehicle</p>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-1">From</p>
                <Badge variant="outline" className="mb-2">{trip.fromType}</Badge>
                {trip.fromType === "SHOP" && trip.shop ? (
                  <div>
                    <p className="font-medium">{trip.shop.name}</p>
                    <p className="text-sm text-muted-foreground">{trip.shop.address}</p>
                    <p className="text-sm text-muted-foreground">{trip.shop.phone}</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">{trip.customerName || "Customer"}</p>
                    <p className="text-sm text-muted-foreground">{trip.customerPhone}</p>
                    {trip.customerAddress && (
                      <p className="text-sm text-muted-foreground">{trip.customerAddress}</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{formatDate(trip.startedAt)}</p>
                  <p className="text-sm text-muted-foreground">Started</p>
                </div>
              </div>

              {trip.notes && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{trip.notes}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Receive Action */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <PackageCheck className="h-5 w-5" />
                Confirm Receipt
              </CardTitle>
              <CardDescription>
                This will create warranty cards for unregistered items and create claims for all items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiveNotes">Receipt Notes (Optional)</Label>
                <Textarea
                  id="receiveNotes"
                  placeholder="Any notes about the receipt..."
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>What happens when you receive:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Items with warranty cards: Claims created automatically</li>
                    <li>Items without warranty cards: Cards registered using shop info, then claims created</li>
                    <li>All claims enter your default workflow</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button
                className="w-full"
                size="lg"
                onClick={handleReceive}
                disabled={receiving || trip.items.length === 0}
              >
                {receiving ? (
                  <>Processing...</>
                ) : (
                  <>
                    <PackageCheck className="h-5 w-5 mr-2" />
                    Receive {trip.items.length} Items
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
