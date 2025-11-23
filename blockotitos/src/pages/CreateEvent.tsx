import React, { useState, useRef } from "react";
import { Layout, Text, Button, Input } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import { saveLocalEvent } from "../utils/localEvents";
import { createEventRequest } from "../util/backend";
import TldrCard from "../components/layout/TldrCard";
import { buildErrorDetail, buildTxDetail } from "../utils/notificationHelpers";

const CreateEvent: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const isConnected = !!address;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    eventName: "",
    eventDate: "",
    location: "",
    description: "",
    maxSpots: "",
    claimStart: "",
    claimEnd: "",
    imageUrl: "",
    imageFile: null as File | null,
    imagePreview: "",
    metadataUri: "",
  });

  const [distributionMethods, setDistributionMethods] = useState({
    qr: true,
    link: true,
    geolocation: false,
    code: false,
    nfc: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert("Por favor, selecciona un archivo de imagen válido");
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede ser mayor a 5MB");
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: reader.result as string,
        imageUrl: "", // Limpiar URL si hay archivo
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      imageFile: null,
      imagePreview: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMethodToggle = (method: keyof typeof distributionMethods) => {
    setDistributionMethods(prev => ({
      ...prev,
      [method]: !prev[method],
    }));
  };

  const placeholderImage = "https://via.placeholder.com/300";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      showNotification({
        type: "error",
        title: "Wallet no conectada",
        message: "Por favor, conecta tu wallet primero",
      });
      return;
    }

    if (
      !formData.eventName ||
      !formData.eventDate ||
      !formData.location ||
      !formData.description ||
      !formData.maxSpots ||
      !formData.claimStart ||
      !formData.claimEnd
    ) {
      showNotification({
        type: "error",
        title: "Campos requeridos",
        message: "Por favor, completa todos los campos requeridos",
      });
      return;
    }

    try {
      // Convertir fechas a timestamps Unix (segundos)
      const eventDate = Math.floor(new Date(formData.eventDate).getTime() / 1000);
      const claimStart = Math.floor(new Date(formData.claimStart).getTime() / 1000);
      const claimEnd = Math.floor(new Date(formData.claimEnd).getTime() / 1000);

      // Metadata URI - por ahora usar un placeholder
      const metadataUri = formData.metadataUri || `https://spot.example.com/metadata/${Date.now()}`;

      const imageUrlForRequest = formData.imageFile ? undefined : (formData.imageUrl || placeholderImage);
      const localPreviewFallback = formData.imageFile
        ? formData.imagePreview || placeholderImage
        : imageUrlForRequest || placeholderImage;

      // Guardar evento localmente (temporal hasta que el contrato esté configurado)
      setIsSubmitting(true);
      
      try {
        const backendPayload = {
          creator: address!,
          eventName: formData.eventName,
          eventDate,
          location: formData.location,
          description: formData.description,
          maxPoaps: parseInt(formData.maxSpots),
          claimStart,
          claimEnd,
          metadataUri,
          imageUrl: imageUrlForRequest,
          imageFile: formData.imageFile ?? undefined,
        };

        const backendResponse = await createEventRequest(backendPayload);
        const newEventId = backendResponse.eventId;
        if (!newEventId) {
          console.warn(
            "El backend no devolvió eventId; los links podrían no coincidir hasta sincronizar on-chain.",
          );
        }

        const resolvedImageUrl = backendResponse.imageUrl || localPreviewFallback || placeholderImage;

        const newEvent = saveLocalEvent(
          {
            name: formData.eventName,
            date: formData.eventDate,
            location: formData.location,
            description: formData.description,
            maxSpots: parseInt(formData.maxSpots),
            claimStart: formData.claimStart,
            claimEnd: formData.claimEnd,
            imageUrl: resolvedImageUrl,
            metadataUri,
            creator: address!,
            distributionMethods,
          },
          {
            id: newEventId ? newEventId.toString() : undefined,
          },
        );

        console.log("Evento creado exitosamente (local):", newEvent);
        
        // Disparar evento personalizado para actualizar otras pestañas/páginas
        window.dispatchEvent(new Event('localStorageUpdated'));
        
        showNotification({
          type: "success",
          title: "Evento creado",
          message: "Tu evento SPOT está listo. Copia el detalle si necesitas reenviar la transacción.",
          copyText: buildTxDetail(backendResponse.txHash, {
            eventId: newEventId ?? newEvent.id,
            creator: address,
          }),
        });
        
        // Limpiar formulario
        setFormData({
          eventName: "",
          eventDate: "",
          location: "",
          description: "",
          maxSpots: "",
          claimStart: "",
          claimEnd: "",
          imageUrl: "",
          imageFile: null,
          imagePreview: "",
          metadataUri: "",
        });
        setDistributionMethods({
          qr: true,
          link: true,
          geolocation: false,
          code: false,
          nfc: false,
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        // Navegar a mis eventos después de un pequeño delay
        setTimeout(() => {
          navigate("/my-events");
        }, 500);
      } catch (error: any) {
        console.error("Error al crear evento:", error);
        showNotification({
          type: "error",
          title: "Error al crear evento",
          message: "No pudimos crear el evento. Copia el detalle para soporte.",
          copyText: buildErrorDetail(error),
        });
      } finally {
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error("Error al crear evento:", error);
      showNotification({
        type: "error",
        title: "Error al crear evento",
        message: "No pudimos crear el evento. Copia el detalle para soporte.",
        copyText: buildErrorDetail(error),
      });
    }
  };

  if (!isConnected) {
    return (
      <Layout.Content>
        <Layout.Inset>
          <div className="min-h-screen bg-stellar-white py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-6">🔐</div>
              <Text as="h2" size="lg" className="text-2xl font-headline text-stellar-black mb-4">
                Conecta tu Wallet
              </Text>
            <Text as="p" size="md" className="text-stellar-black mb-6 font-body">
              Necesitas conectar tu wallet para crear un evento.
            </Text>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/")}
              className="bg-stellar-gold text-stellar-black rounded-full px-8 py-3 font-semibold"
              >
              Ir a Home
            </Button>
          </div>
          </div>
        </Layout.Inset>
      </Layout.Content>
    );
  }

  return (
    <Layout.Content>
      <Layout.Inset>
        <div className="min-h-screen bg-stellar-white py-6 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10 space-y-6">
            <div>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => navigate("/")}
                className="mb-4"
              >
                ← Volver
              </Button>
              <Text as="h1" size="xl" className="text-3xl md:text-4xl font-headline text-stellar-black mb-2">
                Crear Evento
              </Text>
              <Text as="p" size="md" className="text-stellar-black font-subhead italic">
                Completa el formulario para crear tu evento SPOT
              </Text>
            </div>
                <TldrCard
                  label=""
                  summary="Antes de completar el formulario, asegúrate de tener arte, fechas y métodos de entrega listos."
                  bullets={[
                    { label: "Visual", detail: "Usa imágenes humanas y resalta highlights." },
                    { label: "Tiempo", detail: "Define claim window claro (inicio/fin)." },
                    { label: "Métodos", detail: "Activa QR, link, código, geo o NFC según tu audiencia." },
                  ]}
                />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Name */}
            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-stellar-black mb-2 font-body uppercase tracking-wide">
                Nombre del Evento *
              </label>
              <Input
                id="eventName"
                fieldSize="md"
                name="eventName"
                type="text"
                value={formData.eventName}
                onChange={handleInputChange}
                placeholder="Ej: Hackathon Stellar 2024"
                required
                className="w-full !border-2 !border-stellar-lilac/60 rounded-full px-4 py-2 focus:!border-stellar-lilac focus:ring-2 focus:ring-stellar-lilac/20"
                style={{ border: '2px solid rgba(183, 172, 232, 0.6)', borderRadius: '9999px' }}
              />
            </div>

            {/* Event Date */}
            <div>
              <label htmlFor="eventDate" className="block text-sm font-medium text-black mb-2">
                Fecha del Evento *
              </label>
              <Input
                id="eventDate"
                fieldSize="md"
                name="eventDate"
                type="datetime-local"
                value={formData.eventDate}
                onChange={handleInputChange}
                required
                className="w-full !border-2 !border-stellar-lilac/60 rounded-full px-4 py-2 focus:!border-stellar-lilac focus:ring-2 focus:ring-stellar-lilac/20"
                style={{ border: '2px solid rgba(183, 172, 232, 0.6)', borderRadius: '9999px' }}
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-black mb-2">
                Ubicación *
              </label>
              <Input
                id="location"
                fieldSize="md"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Ej: Bogotá, Colombia"
                required
                className="w-full !border-2 !border-stellar-lilac/60 rounded-full px-4 py-2 focus:!border-stellar-lilac focus:ring-2 focus:ring-stellar-lilac/20"
                style={{ border: '2px solid rgba(183, 172, 232, 0.6)', borderRadius: '9999px' }}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-black mb-2">
                Descripción *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe tu evento..."
                required
                rows={4}
                className="w-full px-4 py-2 border-2 border-stellar-lilac/60 rounded-2xl focus:border-stellar-lilac focus:ring-2 focus:ring-stellar-lilac/20 resize-none"
                style={{ border: '2px solid rgba(183, 172, 232, 0.6)', borderRadius: '1rem' }}
              />
            </div>

            {/* Max SPOTs */}
            <div>
              <label htmlFor="maxSpots" className="block text-sm font-medium text-black mb-2">
                Máximo de SPOTs *
              </label>
              <Input
                id="maxSpots"
                fieldSize="md"
                name="maxSpots"
                type="number"
                value={formData.maxSpots}
                onChange={handleInputChange}
                placeholder="Ej: 100"
                min="1"
                required
                className="w-full !border-2 !border-stellar-lilac/60 rounded-full px-4 py-2 focus:!border-stellar-lilac focus:ring-2 focus:ring-stellar-lilac/20"
                style={{ border: '2px solid rgba(183, 172, 232, 0.6)', borderRadius: '9999px' }}
              />
            </div>

            {/* Claim Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="claimStart" className="block text-sm font-medium text-black mb-2">
                  Inicio de Reclamo *
                </label>
                <Input
                  id="claimStart"
                fieldSize="md"
                  name="claimStart"
                  type="datetime-local"
                  value={formData.claimStart}
                  onChange={handleInputChange}
                  required
                  className="w-full !border-2 !border-stellar-lilac/60 rounded-full px-4 py-2 focus:!border-stellar-lilac focus:ring-2 focus:ring-stellar-lilac/20"
                  style={{ border: '2px solid rgba(183, 172, 232, 0.6)', borderRadius: '9999px' }}
                />
              </div>
              <div>
                <label htmlFor="claimEnd" className="block text-sm font-medium text-black mb-2">
                  Fin de Reclamo *
                </label>
                <Input
                  id="claimEnd"
                fieldSize="md"
                  name="claimEnd"
                  type="datetime-local"
                  value={formData.claimEnd}
                  onChange={handleInputChange}
                  required
                  className="w-full !border-2 !border-stellar-lilac/60 rounded-full px-4 py-2 focus:!border-stellar-lilac focus:ring-2 focus:ring-stellar-lilac/20"
                  style={{ border: '2px solid rgba(183, 172, 232, 0.6)', borderRadius: '9999px' }}
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-stellar-black mb-2 font-body uppercase tracking-wide">
                Imagen del Evento *
              </label>
              
              {/* Preview de imagen */}
              {formData.imagePreview && (
                <div className="mb-4 relative">
                  <img
                    src={formData.imagePreview}
                    alt="Preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-stellar-lilac/20"
                  />
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500/80 text-white hover:bg-red-600 rounded-full px-4 py-1.5 shadow-md"
                  >
                    ✕ Remover
                  </Button>
                </div>
              )}

              {/* Input de archivo */}
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="imageFile"
                />
                <Button
                  type="button"
                  variant="tertiary"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-stellar-lilac/20 text-stellar-black hover:bg-stellar-lilac/30 font-body"
                >
                  📷 {formData.imageFile ? "Cambiar Imagen" : "Subir Imagen"}
                </Button>
                {formData.imageFile && (
                  <Text as="p" size="sm" className="text-stellar-black/70 font-body">
                    {formData.imageFile.name} ({(formData.imageFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Text>
                )}
              </div>

              {/* Opción alternativa: URL */}
              <div className="mt-4">
                <Text as="p" size="sm" className="text-stellar-black/70 mb-2 font-body">
                  O ingresa una URL de imagen:
                </Text>
              <Input
                id="imageUrl"
                fieldSize="md"
                name="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={handleInputChange}
                placeholder="https://example.com/image.png o /images/events/mi-evento.jpg"
                disabled={!!formData.imageFile}
                className="w-full !border-2 !border-stellar-lilac/60 rounded-full px-4 py-2 focus:!border-stellar-lilac focus:ring-2 focus:ring-stellar-lilac/20 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: '2px solid rgba(183, 172, 232, 0.6)', borderRadius: '9999px' }}
              />
              </div>

              {/* Nota sobre almacenamiento */}
              <Text as="p" size="xs" className="text-stellar-black/50 mt-2 font-body italic">
                Nota: Por ahora, las imágenes se almacenarán temporalmente. Para producción, se implementará almacenamiento permanente (IPFS, Firebase, etc.)
              </Text>
            </div>

            {/* Metadata URI */}
            <div>
              <label htmlFor="metadataUri" className="block text-sm font-medium text-stellar-black mb-2 font-body uppercase tracking-wide">
                URI de Metadata (Opcional)
              </label>
              <Input
                id="metadataUri"
                fieldSize="md"
                name="metadataUri"
                type="url"
                value={formData.metadataUri}
                onChange={handleInputChange}
                placeholder="https://example.com/metadata.json"
                className="w-full !border-2 !border-stellar-lilac/60 rounded-full px-4 py-2 focus:!border-stellar-lilac focus:ring-2 focus:ring-stellar-lilac/20"
                style={{ border: '2px solid rgba(183, 172, 232, 0.6)', borderRadius: '9999px' }}
              />
            </div>

            {/* Distribution Methods */}
            <div>
              <label className="block text-sm font-medium text-stellar-black mb-4 font-body uppercase tracking-wide">
                Métodos de Distribución
              </label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributionMethods.qr}
                    onChange={() => handleMethodToggle("qr")}
                    className="w-5 h-5 text-stellar-lilac border-stellar-black/20 rounded focus:ring-stellar-lilac"
                  />
                  <span className="text-stellar-black font-body">📷 QR Code</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributionMethods.link}
                    onChange={() => handleMethodToggle("link")}
                    className="w-5 h-5 text-stellar-lilac border-stellar-black/20 rounded focus:ring-stellar-lilac"
                  />
                  <span className="text-stellar-black font-body">🔗 Unique Link</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributionMethods.code}
                    onChange={() => handleMethodToggle("code")}
                    className="w-5 h-5 text-stellar-lilac border-stellar-black/20 rounded focus:ring-stellar-lilac"
                  />
                  <span className="text-stellar-black font-body">🔢 Código Compartido</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributionMethods.geolocation}
                    onChange={() => handleMethodToggle("geolocation")}
                    className="w-5 h-5 text-stellar-lilac border-stellar-black/20 rounded focus:ring-stellar-lilac"
                  />
                  <span className="text-stellar-black font-body">📍 Geolocalización</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributionMethods.nfc}
                    onChange={() => handleMethodToggle("nfc")}
                    className="w-5 h-5 text-stellar-lilac border-stellar-black/20 rounded focus:ring-stellar-lilac"
                  />
                  <span className="text-stellar-black font-body">💳 NFC</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className="w-full bg-stellar-gold text-stellar-black hover:bg-yellow-400 font-semibold rounded-full py-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creando evento..." : "Crear Evento"}
              </Button>
            </div>
          </form>
        </div>
        </div>
      </Layout.Inset>
    </Layout.Content>
  );
};

export default CreateEvent;

