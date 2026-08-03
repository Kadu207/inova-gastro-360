import PainelPage from "@/components/PainelPage";

export default function DeliveryPainel() {
  return (
    <PainelPage
      defaultFilter="pending"
      defaultChannel="delivery"
      statusOptions={["pending", "accepted", "preparing", "ready", "out_for_delivery", "delivered"]}
    />
  );
}
