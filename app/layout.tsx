import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lucía · Demo privada | Mytho Solutions",
  description: "Prueba privada de Lucía, la recepcionista virtual de voz de Mytho Solutions.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="es"><body>{children}</body></html>;
}
