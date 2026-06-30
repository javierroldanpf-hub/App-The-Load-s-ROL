import "./globals.css";

export const metadata = {
  title: "The Load's Rol — Panel de Rendimiento",
  description: "Control diario del estado del equipo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          if (window.Capacitor) {
            document.body.style.paddingTop = '55px';
          }
        `}} />
        {children}
      </body>
    </html>
  );
}
