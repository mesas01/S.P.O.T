# 📁 Imágenes de Eventos

Esta carpeta contiene las imágenes de los eventos SPOT.

## 📝 Cómo usar

1. **Coloca tus imágenes aquí**: Sube las imágenes de tus eventos (PNG, JPG, SVG, etc.)

2. **En el código, referencia así**:
   ```typescript
   {
     id: 1,
     name: "Mi Evento",
     date: "2025-11-15",
     image: "/images/events/mi-evento.png", // Ruta relativa desde /public
     color: "from-stellar-lilac/30 to-stellar-lilac/50",
   }
   ```

3. **Formatos soportados**:
   - PNG (recomendado para transparencia)
   - JPG/JPEG
   - SVG (escalable)
   - WebP (optimizado)

4. **Tamaño recomendado**: 
   - Mínimo: 256x256px
   - Óptimo: 512x512px o 1024x1024px
   - Formato: Cuadrado (1:1)

## 🎨 Alternativas

También puedes usar:
- **Emojis**: `image: "🌟"` (como antes)
- **URLs externas**: `image: "https://ejemplo.com/imagen.png"`

## 📌 Nota

Las imágenes se mostrarán en los badges SPOT. Si una imagen falla al cargar, se mostrará un emoji por defecto (🎯).

