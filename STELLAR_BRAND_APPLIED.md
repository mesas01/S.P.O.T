# ✅ Brand Manual de Stellar 2023 - Aplicado a SPOT

## 🎨 Colores Aplicados

### Colores Primarios (Primary)
- **Generous Gold** (`#FDDA24`) - Color de marca principal
  - Uso: Botones principales, highlights, CTAs
  - Clase Tailwind: `bg-stellar-gold`, `text-stellar-gold`
  
- **Stellar Black** (`#0F0F0F`) - Proceso Black
  - Uso: Texto principal, títulos
  - Clase Tailwind: `text-stellar-black`
  
- **Stellar White** (`#F6F7F8`) - Fundación blanca
  - Uso: Fondos predominantes
  - Clase Tailwind: `bg-stellar-white`

### Colores Secundarios (Secondary)
- **Lilac** (`#B7ACE8`) - Conecta con raíces DeFi
  - Uso: Bordes, detalles, botones secundarios
  - Clase Tailwind: `bg-stellar-lilac`, `border-stellar-lilac`
  
- **Teal** (`#00A7B5`) - Contraste perfecto con gold
  - Uso: Acentos, links, información secundaria
  - Clase Tailwind: `text-stellar-teal`, `border-stellar-teal`
  
- **Warm Grey** (`#D6D2C4`) - Alternativa cálida al blanco
  - Uso: Fondos de atención, áreas destacadas
  - Clase Tailwind: `bg-stellar-warm-grey`
  
- **Navy Blue** (`#002E5D`) - "Adulto en la sala"
  - Uso: Elementos serios, información técnica
  - Clase Tailwind: `bg-stellar-navy`, `text-stellar-navy`

---

## 📝 Tipografías Aplicadas

### Headlines (Títulos)
- **Font**: `Anton` (alternativa web a Schabo)
- **Style**: UPPERCASE (mayúsculas)
- **Usage**: Títulos principales (H1, H2, H3)
- **Clase Tailwind**: `font-headline`

**Ejemplo:**
```tsx
<Text as="h1" className="font-headline uppercase">
  SPOT
</Text>
```

### Subheads (Subtítulos)
- **Font**: `Lora` (serif, italic)
- **Style**: Italic, sentence case
- **Usage**: Subtítulos, descripciones más largas
- **Clase Tailwind**: `font-subhead`

**Ejemplo:**
```tsx
<Text as="p" className="font-subhead italic">
  Stellar Proof of Togetherness
</Text>
```

### Body Copy (Texto del cuerpo)
- **Font**: `Inter` (sans-serif)
- **Style**: Regular weight, sentence case
- **Usage**: Texto general, contenido
- **Clase Tailwind**: `font-body`

**Ejemplo:**
```tsx
<Text as="p" className="font-body">
  Crea y reclama NFTs de asistencia...
</Text>
```

---

## 💬 Tone of Voice - Aplicado

### TL;DR (Too Long; Didn't Read)
Siguiendo el Brand Manual de Stellar, agregamos **TL;DR** al inicio de las páginas principales con el componente `TldrCard` (`src/components/layout/TldrCard.tsx`):

```tsx
<Text as="div" size="sm" className="text-stellar-teal mb-2 font-medium uppercase tracking-wider">
  TL;DR
</Text>
<div className="bg-stellar-warm-grey/30 rounded-lg p-3 mt-4">
  <Text as="p" size="sm" className="text-stellar-black font-body">
    <span className="font-semibold">TL;DR:</span> Resumen ejecutivo aquí...
  </Text>
</div>
```

**Aplicado en:**
- ✅ Home page (Hero + Find your way)
- ✅ CreateEvent page
- ✅ Mint page
- ✅ Profile page
- ✅ MyEvents page

### Principios de Escritura
1. **Conclusión al inicio**: TL;DR primero
2. **Pragmático**: Textos directos y útiles
3. **Agradecido**: Respeto por el tiempo del lector
4. **Contextual**: Sabemos dónde está el usuario (móvil, desktop, etc.)

---

## 🎯 Design Ethos - "Helpful design is humble, not invisible"

### Aplicado en:
1. **Navegación clara**: Botones visibles pero no invasivos
2. **Jerarquía de información**: De grande a pequeño
3. **Accesibilidad**: Contraste adecuado, legibilidad
4. **Mobile-first**: Diseño que funciona en móvil primero

---

## 📱 Componentes Actualizados

### Home Page (`/`)
- ✅ TL;DR al inicio
- ✅ Headlines con `font-headline` y uppercase
- ✅ Subheads con `font-subhead` italic
- ✅ Body text con `font-body`
- ✅ Colores Stellar aplicados
- ✅ Sección “Find your way” diferenciando builders vs banca
- ✅ Uso de las superficies `brand-surface` y highlights texturizados

### CreateEvent Page (`/create-event`)
- ✅ TL;DR agregado
- ✅ Tipografías Stellar
- ✅ Botón principal en Generous Gold
- ✅ Checkboxes con colores Stellar

### Mint Page (`/mint`)
- ✅ TL;DR agregado
- ✅ Métodos de distribución con colores Stellar
- ✅ Botones en Generous Gold para acciones principales

### Profile Page (`/profile`)
- ✅ Headlines uppercase
- ✅ Balance destacado con Generous Gold
- ✅ Colores Stellar en toda la página
- ✅ Tarjeta TL;DR con acciones prioritarias

### MyEvents Page (`/my-events`)
- ✅ TL;DR con foco en distribución
- ✅ Cards con highlights y métricas claras
- ✅ Acciones visibles para crear eventos y compartir links

### Componentes
- ✅ `SpotCard`: Colores y tipografías Stellar
- ✅ `MonthSection`: Headlines uppercase
- ✅ `App.tsx`: Background y borders Stellar
- ✅ `TldrCard`: Resumen reutilizable con highlights
- ✅ Clases `brand-surface`, `brand-tldr`, `brand-highlight-text` en `index.css`

---

## 🔧 Configuración Tailwind

```javascript
// tailwind.config.js
colors: {
  // Primary
  'stellar-gold': '#FDDA24',
  'stellar-black': '#0F0F0F',
  'stellar-white': '#F6F7F8',
  
  // Secondary
  'stellar-lilac': '#B7ACE8',
  'stellar-teal': '#00A7B5',
  'stellar-warm-grey': '#D6D2C4',
  'stellar-navy': '#002E5D',
}

fontFamily: {
  'headline': ['Anton', 'sans-serif'],
  'subhead': ['Lora', 'serif'],
  'body': ['Inter', 'sans-serif'],
}
```

---

## ✅ Checklist de Aplicación

- [x] Colores primarios configurados
- [x] Colores secundarios configurados
- [x] Tipografías cargadas (Anton, Lora, Inter)
- [x] Clases Tailwind personalizadas creadas
- [x] Home page actualizada
- [x] CreateEvent page actualizada
- [x] Mint page actualizada
- [x] Profile page actualizada
- [x] Componentes SpotCard y MonthSection actualizados
- [x] TL;DR implementado en páginas principales
- [x] Headlines en uppercase
- [x] Subheads en italic
- [x] Body text con Inter
- [x] Grid de 24 columnas y superficies `brand-surface`

---

## 📋 Próximos Pasos (Opcional)

- [ ] Agregar highlights personalizados (SVG según Brand Manual)
- [ ] Llevar el grid de 24 columnas a Debugger y vistas secundarias
- [ ] Agregar ilustraciones estilo Street Art (cuando sea necesario)
- [ ] Motion graphics siguiendo guías de Stellar
- [ ] Fotografías siguiendo las 10 reglas de Stellar

---

**Referencia**: Brand Manual 2023 - Stellar Development Foundation (Abril 2023)

