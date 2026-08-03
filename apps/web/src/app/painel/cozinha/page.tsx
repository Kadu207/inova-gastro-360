import PainelPage from "@/components/PainelPage";

export default function CozinhaPainel() {
  return (
    <PainelPage
      defaultFilter="preparing"
      statusOptions={["accepted", "preparing", "ready"]}
    />
  );
}
