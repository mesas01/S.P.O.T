import React, { useState, useRef } from "react";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import { saveLocalEvent } from "../utils/localEvents";
import { createEventRequest } from "../util/backend";
import TldrCard from "../components/layout/TldrCard";
import { buildErrorDetail, buildTxDetail } from "../utils/notificationHelpers";
import {
  Lock,
  QrCode,
  Link2,
  Hash,
  MapPin,
  Nfc,
  X,
  Upload,
  ArrowLeft,
  Loader2,
} from "lucide-react";

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

  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecciona un archivo de imagen válido");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede ser mayor a 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: reader.result as string,
        imageUrl: "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageFile: null, imagePreview: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMethodToggle = (method: keyof typeof distributionMethods) => {
    setDistributionMethods((prev) => ({ ...prev, [method]: !prev[method] }));
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
      const eventDate = Math.floor(
        new Date(formData.eventDate).getTime() / 1000,
      );
      const claimStart = Math.floor(
        new Date(formData.claimStart).getTime() / 1000,
      );
      const claimEnd = Math.floor(
        new Date(formData.claimEnd).getTime() / 1000,
      );

      const metadataUri =
        formData.metadataUri ||
        `https://spot.example.com/metadata/${Date.now()}`;

      const imageUrlForRequest = formData.imageFile
        ? undefined
        : formData.imageUrl || placeholderImage;
      const localPreviewFallback = formData.imageFile
        ? formData.imagePreview || placeholderImage
        : imageUrlForRequest || placeholderImage;

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

        const resolvedImageUrl =
          backendResponse.imageUrl || localPreviewFallback || placeholderImage;

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
          { id: newEventId ? newEventId.toString() : undefined },
        );

        console.log("Evento creado exitosamente (local):", newEvent);
        window.dispatchEvent(new Event("localStorageUpdated"));

        showNotification({
          type: "success",
          title: "Evento creado",
          message:
            "Tu evento SPOT está listo. Copia el detalle si necesitas reenviar la transacción.",
          copyText: buildTxDetail(backendResponse.txHash, {
            eventId: newEventId ?? newEvent.id,
            creator: address,
          }),
        });

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
        if (fileInputRef.current) fileInputRef.current.value = "";

        setTimeout(() => {
          navigate("/my-events");
        }, 500);
      } catch (error: any) {
        console.error("Error al crear evento:", error);
        showNotification({
          type: "error",
          title: "Error al crear evento",
          message:
            "No pudimos crear el evento. Copia el detalle para soporte.",
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

  const inputClass =
    "w-full px-4 py-3 bg-white border border-stellar-black/15 rounded-xl text-stellar-black font-body text-sm placeholder:text-stellar-black/30 focus:outline-none focus:ring-2 focus:ring-stellar-lilac/30 focus:border-stellar-lilac/50 transition-colors";
  const labelClass =
    "block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/50 mb-2";

  const distributionMethodConfigs = [
    { key: "qr" as const, Icon: QrCode, label: "QR Code" },
    { key: "link" as const, Icon: Link2, label: "Link Único" },
    { key: "code" as const, Icon: Hash, label: "Código" },
    { key: "geolocation" as const, Icon: MapPin, label: "Geolocalización" },
    { key: "nfc" as const, Icon: Nfc, label: "NFC" },
  ];

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-stellar-lilac/10 border border-stellar-lilac/20 flex items-center justify-center">
              <Lock size={28} className="text-stellar-lilac" />
            </div>
          </div>
          <h2 className="text-2xl font-headline text-stellar-black mb-3">
            Conecta tu Wallet
          </h2>
          <p className="text-stellar-black/60 font-body mb-8">
            Necesitas conectar tu wallet para crear un evento.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-8 py-3 rounded-full font-semibold font-body hover:bg-stellar-gold/90 transition-all shadow-md"
          >
            Ir a Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <div className="mb-10">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm text-stellar-black/50 hover:text-stellar-black font-body transition-colors mb-6"
          >
            <ArrowLeft size={14} />
            Volver
          </button>
          <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-3">
            Crear Evento
          </h1>
          <p className="text-stellar-black/60 font-body">
            Completa el formulario para crear tu evento SPOT
          </p>
          <div className="mt-6">
            <TldrCard
              label=""
              summary="Antes de completar el formulario, asegúrate de tener arte, fechas y métodos de entrega listos."
              bullets={[
                {
                  label: "Visual",
                  detail: "Usa imágenes humanas y resalta highlights.",
                },
                {
                  label: "Tiempo",
                  detail: "Define claim window claro (inicio/fin).",
                },
                {
                  label: "Métodos",
                  detail:
                    "Activa QR, link, código, geo o NFC según tu audiencia.",
                },
              ]}
            />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div>
            <label htmlFor="eventName" className={labelClass}>
              Nombre del Evento *
            </label>
            <input
              id="eventName"
              name="eventName"
              type="text"
              value={formData.eventName}
              onChange={handleInputChange}
              placeholder="Ej: Hackathon Stellar 2024"
              required
              className={inputClass}
            />
          </div>

          {/* Event Date */}
          <div>
            <label htmlFor="eventDate" className={labelClass}>
              Fecha del Evento *
            </label>
            <input
              id="eventDate"
              name="eventDate"
              type="datetime-local"
              value={formData.eventDate}
              onChange={handleInputChange}
              min={nowLocal}
              required
              className={inputClass}
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className={labelClass}>
              Ubicación *
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Ej: Bogotá, Colombia"
              required
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>
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
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Max SPOTs */}
          <div>
            <label htmlFor="maxSpots" className={labelClass}>
              Máximo de SPOTs *
            </label>
            <input
              id="maxSpots"
              name="maxSpots"
              type="number"
              value={formData.maxSpots}
              onChange={handleInputChange}
              placeholder="Ej: 100"
              min="1"
              required
              className={inputClass}
            />
          </div>

          {/* Claim Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="claimStart" className={labelClass}>
                Inicio de Reclamo *
              </label>
              <input
                id="claimStart"
                name="claimStart"
                type="datetime-local"
                value={formData.claimStart}
                onChange={handleInputChange}
                min={formData.eventDate || nowLocal}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="claimEnd" className={labelClass}>
                Fin de Reclamo *
              </label>
              <input
                id="claimEnd"
                name="claimEnd"
                type="datetime-local"
                value={formData.claimEnd}
                onChange={handleInputChange}
                min={formData.claimStart || formData.eventDate || nowLocal}
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className={labelClass}>Imagen del Evento</label>

            {/* Preview */}
            {formData.imagePreview && (
              <div className="mb-4 relative inline-block">
                <img
                  src={formData.imagePreview}
                  alt="Preview"
                  className="w-full max-w-md h-48 object-cover rounded-xl border border-stellar-lilac/20"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-stellar-black/60 text-white rounded-full hover:bg-stellar-black transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="imageFile"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 bg-stellar-lilac/10 border border-stellar-lilac/30 text-stellar-black hover:bg-stellar-lilac/20 px-5 py-2.5 rounded-xl font-body text-sm font-semibold transition-all"
              >
                <Upload size={14} />
                {formData.imageFile ? "Cambiar Imagen" : "Subir Imagen"}
              </button>
              {formData.imageFile && (
                <span className="text-sm text-stellar-black/60 font-body">
                  {formData.imageFile.name} (
                  {(formData.imageFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs text-stellar-black/50 font-body mb-2">
                O ingresa una URL de imagen:
              </p>
              <input
                id="imageUrl"
                name="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={handleInputChange}
                placeholder="https://example.com/image.png o /images/events/mi-evento.jpg"
                disabled={!!formData.imageFile}
                className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              />
            </div>

            <p className="text-xs text-stellar-black/40 mt-2 font-body italic">
              Las imágenes se almacenarán temporalmente. Para producción, se
              implementará almacenamiento permanente (IPFS, Firebase, etc.)
            </p>
          </div>

          {/* Metadata URI */}
          <div>
            <label htmlFor="metadataUri" className={labelClass}>
              URI de Metadata (Opcional)
            </label>
            <input
              id="metadataUri"
              name="metadataUri"
              type="url"
              value={formData.metadataUri}
              onChange={handleInputChange}
              placeholder="https://example.com/metadata.json"
              className={inputClass}
            />
          </div>

          {/* Distribution Methods */}
          <div>
            <label className={labelClass}>Métodos de Distribución</label>
            <div className="flex flex-wrap gap-3">
              {distributionMethodConfigs.map(({ key, Icon, label }) => {
                const isActive = distributionMethods[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleMethodToggle(key)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold font-body transition-all ${
                      isActive
                        ? "bg-stellar-lilac/15 border-stellar-lilac/40 text-stellar-black"
                        : "border-stellar-black/10 text-stellar-black/40 hover:border-stellar-black/20 hover:text-stellar-black/60"
                    }`}
                  >
                    <Icon
                      size={13}
                      className={
                        isActive
                          ? "text-stellar-lilac"
                          : "text-stellar-black/30"
                      }
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-stellar-gold text-stellar-black px-8 py-4 rounded-full font-semibold font-body text-base hover:bg-stellar-gold/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creando evento...
                </>
              ) : (
                "Crear Evento"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
