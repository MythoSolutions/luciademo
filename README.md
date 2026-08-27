# Lucía · Demo privada

Landing temporal de Mytho Solutions para probar a Lucía, una recepcionista virtual de voz con el widget oficial de Retell.

## Configuración local

1. Copia `.env.example` como `.env.local`.
2. Añade únicamente `NEXT_PUBLIC_RETELL_VOICE_PUBLIC_KEY` y `NEXT_PUBLIC_RETELL_AGENT_ID`.
3. Ejecuta `npm run dev` y abre la dirección que muestra la terminal. Sin ambas variables, el sitio muestra una indicación sólo durante desarrollo y no carga el widget.

La duración máxima de cinco minutos se configura en el agente de Retell (`max_call_duration_ms = 300000`), no en esta página.

## Publicación manual

### GitHub

1. Crea un repositorio vacío en GitHub.
2. Desde esta carpeta, inicializa Git si hace falta, confirma los archivos y agrega el remoto.
3. Sube la rama deseada. No incluyas `.env.local`.

### Vercel

1. Importa el repositorio desde el panel de Vercel.
2. Conserva la configuración detectada de Next.js.
3. En **Environment Variables**, crea las mismas dos variables públicas para Production y Preview.
4. Despliega. Vercel compilará la landing sin un backend adicional.
