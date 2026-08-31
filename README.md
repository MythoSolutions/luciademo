# Lucía · Demo privada protegida

Landing de una sola entrada para hablar con Lucía. La misma llamada cubre cinco familias de atención o cualquier otro negocio descrito por la persona. La prueba dura aproximadamente cinco minutos y las acciones del negocio son ficticias.

## Qué protege la entrada

El navegador sólo recibe la clave pública del reto anti‑bot. La clave de Retell, el agente y el acceso a n8n permanecen en el servidor. Antes de crear una llamada se comprueban:

- origen de la petición y reto Cloudflare Turnstile;
- máximo de tres pruebas por conexión al día;
- presupuesto diario y estado general de la demo;
- reserva de la sesión antes de entregar el acceso temporal.

Retell firma los eventos y la captación de interesados. El servidor valida la firma sobre el cuerpo original, envía a n8n únicamente los datos operativos necesarios y no reenvía transcripciones. n8n guarda sesiones, eventos y leads, además de avisar por Telegram.

## Configuración

1. Copia `.env.example` como `.env.local` y completa los valores sin subir ese archivo al repositorio.
2. Configura `LUCIA_PUBLIC_ORIGIN=https://lucia.mythosolutionsit.com` y `LUCIA_CLIENT_IP_HEADER` con la cabecera que garantice el proveedor de alojamiento. No expongas la aplicación directamente detrás de una cabecera falsificable.
3. En Retell, usa `/api/retell/webhook` como webhook del agente y `/api/retell/lead` como destino de la función `save_lucia_lead`.
4. Mantén `LUCIA_DEMO_ENABLED=false` hasta verificar el dominio, Turnstile, n8n y el borrador de Retell. Cambiarlo a `true` es el último paso de apertura.

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` es la única configuración pública. `RETELL_API_KEY`, `RETELL_AGENT_ID`, las claves de Turnstile y n8n, y el secreto de hash son exclusivos del servidor.

## Validación local

```text
npm ci
npm run validate:landing
npm run lint
npm run build
```

La validación comprueba la entrada única, las cinco rutas, los límites honestos, el aislamiento de secretos, las firmas Retell, el reto anti‑bot, las cabeceras defensivas, accesibilidad y adaptación móvil.

## Estado de publicación

El blindaje está implementado y se autorizó publicar la landing en pausa en `https://lucia.mythosolutionsit.com`. No debe habilitar llamadas hasta completar la conciliación privada de Retell, probar el recorrido integral y recibir autorización humana final.
