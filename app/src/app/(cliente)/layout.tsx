import NavCliente from "@/components/NavCliente";

export default function LayoutCliente({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <NavCliente />
    </>
  );
}
