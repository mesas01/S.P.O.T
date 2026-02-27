import React, { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDateLocale } from "../utils/dateFormat";
import {
  createCommunityRequest,
  fetchCommunities,
  fetchCommunityEvents,
  joinCommunityRequest,
  leaveCommunityRequest,
  updateCommunityRequest,
} from "../util/backend";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  MapPin,
  Plus,
  ChevronDown,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

const Communities: React.FC = () => {
  const { address } = useWallet();
  const navigate = useNavigate();
  const { t } = useTranslation("communities");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [eventsByCommunity, setEventsByCommunity] = useState<
    Record<
      number,
      {
        id: number;
        name: string;
        date: string;
      }[]
    >
  >({});
  const [loadingEvents, setLoadingEvents] = useState<Record<number, boolean>>(
    {},
  );
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    description: "",
    imageUrl: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    country: "",
    description: "",
    imageUrl: "",
  });

  const queryClient = useQueryClient();

  const { data: communities = [], isLoading: isLoadingCommunities } = useQuery({
    queryKey: ["communities"],
    queryFn: fetchCommunities,
    retry: 2,
    staleTime: 15000,
  });

  const handleToggle = async (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (!next) return;

    const communityId = Number(next);
    if (Number.isNaN(communityId) || eventsByCommunity[communityId]) return;
    setLoadingEvents((prev) => ({ ...prev, [communityId]: true }));
    try {
      const events = await fetchCommunityEvents(communityId);
      const normalized = events.map((event) => ({
        id: event.eventId,
        name: event.name,
        date: new Date(event.date * 1000).toISOString(),
      }));
      setEventsByCommunity((prev) => ({ ...prev, [communityId]: normalized }));
    } finally {
      setLoadingEvents((prev) => ({ ...prev, [communityId]: false }));
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    if (!formData.name || !formData.country || !formData.description) return;

    await createCommunityRequest({
      name: formData.name.trim(),
      country: formData.country.trim(),
      description: formData.description.trim(),
      imageUrl:
        formData.imageUrl.trim() ||
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80",
      creatorAddress: address,
    });

    setFormData({
      name: "",
      country: "",
      description: "",
      imageUrl: "",
    });
    await queryClient.invalidateQueries({ queryKey: ["communities"] });
    setIsCreating(false);
  };

  const startEditing = (community: {
    id: number;
    name: string;
    country: string;
    description: string;
    imageUrl: string;
  }) => {
    setEditingId(community.id);
    setEditForm({
      name: community.name,
      country: community.country,
      description: community.description,
      imageUrl: community.imageUrl,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdateCommunity = async (communityId: number) => {
    if (!address) return;
    await updateCommunityRequest(communityId, {
      creatorAddress: address,
      name: editForm.name.trim(),
      country: editForm.country.trim(),
      description: editForm.description.trim(),
      imageUrl: editForm.imageUrl.trim(),
    });
    await queryClient.invalidateQueries({ queryKey: ["communities"] });
    setEditingId(null);
  };

  return (
    <div className="py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-stellar-teal/10 border border-stellar-teal/20 rounded-full px-4 py-1.5 mb-3">
              <span className="text-xs font-semibold font-body uppercase tracking-widest text-stellar-teal">
                {t("badge")}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-headline text-stellar-black mb-2">
              {t("title")}
            </h1>
            <p className="text-stellar-black/60 font-body max-w-2xl">
              {t("subtitle")}
            </p>
          </div>
          <button
            onClick={() => setIsCreating((prev) => !prev)}
            className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-5 py-2.5 rounded-full font-semibold font-body text-sm hover:bg-stellar-gold/90 transition-all shadow-md"
          >
            <Plus size={14} />
            {t("createCommunity")}
          </button>
        </div>

        {isCreating && (
          <form
            onSubmit={handleCreateCommunity}
            className="bg-stellar-white rounded-3xl shadow-sm p-6 md:p-8 border border-stellar-lilac/15 mb-8"
          >
            {!address && (
              <div className="mb-4 rounded-xl border border-stellar-gold/30 bg-stellar-gold/10 px-4 py-3 text-sm text-stellar-black/70 font-body">
                {t("connectToCreate")}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/50 mb-2">
                  {t("form.name")}
                </label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-white border border-stellar-black/15 rounded-xl text-stellar-black font-body text-sm focus:outline-none focus:ring-2 focus:ring-stellar-lilac/30"
                  placeholder={t("form.namePlaceholder")}
                  disabled={!address}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/50 mb-2">
                  {t("form.country")}
                </label>
                <input
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      country: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-white border border-stellar-black/15 rounded-xl text-stellar-black font-body text-sm focus:outline-none focus:ring-2 focus:ring-stellar-lilac/30"
                  placeholder={t("form.countryPlaceholder")}
                  disabled={!address}
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/50 mb-2">
                {t("form.description")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 bg-white border border-stellar-black/15 rounded-xl text-stellar-black font-body text-sm focus:outline-none focus:ring-2 focus:ring-stellar-lilac/30 resize-none"
                rows={3}
                placeholder={t("form.descriptionPlaceholder")}
                disabled={!address}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/50 mb-2">
                {t("form.image")}
              </label>
              <input
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                className="w-full px-4 py-3 bg-white border border-stellar-black/15 rounded-xl text-stellar-black font-body text-sm focus:outline-none focus:ring-2 focus:ring-stellar-lilac/30"
                placeholder={t("form.imagePlaceholder")}
                disabled={!address}
              />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={!address}
                className="inline-flex items-center gap-2 bg-stellar-lilac text-white px-5 py-2.5 rounded-full font-semibold font-body text-sm hover:bg-stellar-lilac/90 transition-all shadow-md"
              >
                {t("form.save")}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="inline-flex items-center gap-2 border border-stellar-black/15 text-stellar-black/60 px-5 py-2.5 rounded-full font-semibold font-body text-sm hover:text-stellar-black hover:border-stellar-black/30 transition-all"
              >
                {t("form.cancel")}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {isLoadingCommunities ? (
            <div className="bg-stellar-white rounded-2xl shadow-sm border border-stellar-lilac/15 p-8 text-center">
              <p className="text-stellar-black/60 font-body">
                {t("loading")}
              </p>
            </div>
          ) : communities.length === 0 ? (
            <div className="bg-stellar-white rounded-2xl shadow-sm border border-stellar-lilac/15 p-8 text-center">
              <p className="text-stellar-black/60 font-body">
                {t("empty")}
              </p>
            </div>
          ) : (
            communities.map((community) => {
              const communityId = community.id;
              const isExpanded = expandedId === communityId.toString();
              const membersCount = community.members?.length || 0;
              const events = eventsByCommunity[communityId] || [];
              const eventsCountLabel = eventsByCommunity[communityId]
                ? eventsByCommunity[communityId].length.toString()
                : "—";
              const isMember =
                !!address &&
                community.members?.some(
                  (member) =>
                    member.address.toLowerCase() === address.toLowerCase(),
                );
              const isCreator =
                !!address &&
                community.creatorAddress?.toLowerCase() ===
                  address.toLowerCase();

              return (
                <div
                  key={community.id}
                  className="bg-stellar-white rounded-2xl shadow-sm border border-stellar-black/10 hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  <div
                    className="p-5 md:p-6 cursor-pointer"
                    onClick={() => handleToggle(communityId.toString())}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-stellar-lilac/20 flex-shrink-0 bg-stellar-warm-grey/20">
                        <img
                          src={community.imageUrl}
                          alt={community.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h2 className="text-xl md:text-2xl font-headline text-stellar-black">
                              {community.name}
                            </h2>
                            <div className="flex flex-wrap gap-3 text-sm text-stellar-black/50 font-body mt-2">
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={13} />
                                {community.country}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Users size={13} />
                                {membersCount} {t("members")}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays size={13} />
                                {eventsCountLabel} {t("events")}
                              </span>
                            </div>
                          </div>
                          <button className="flex-shrink-0 text-stellar-black/30 hover:text-stellar-black transition-colors">
                            {isExpanded ? (
                              <ChevronDown size={18} />
                            ) : (
                              <ChevronRight size={18} />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-stellar-black/60 font-body line-clamp-2">
                          {community.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-stellar-black/8 p-5 md:p-6 bg-stellar-warm-grey/15 space-y-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={async () => {
                            if (!address) return;
                            if (isMember) {
                              await leaveCommunityRequest(communityId, address);
                            } else {
                              await joinCommunityRequest(communityId, address);
                            }
                            await queryClient.invalidateQueries({
                              queryKey: ["communities"],
                            });
                          }}
                          disabled={!address}
                          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold font-body text-sm transition-all ${
                            isMember
                              ? "bg-stellar-black/10 text-stellar-black"
                              : "bg-stellar-teal text-white hover:bg-stellar-teal/90"
                          } ${address ? "" : "opacity-50 cursor-not-allowed"}`}
                        >
                          {isMember ? t("leave") : t("join")}
                        </button>
                        {!address && (
                          <span className="text-xs text-stellar-black/40 font-body">
                            {t("connectToJoin")}
                          </span>
                        )}
                        <button
                          onClick={() =>
                            navigate(`/create-event?communityId=${communityId}`)
                          }
                          className="inline-flex items-center gap-2 bg-stellar-gold text-stellar-black px-4 py-2 rounded-full font-semibold font-body text-xs hover:bg-stellar-gold/90 transition-all"
                        >
                          {t("createEventHere")}
                        </button>
                        {isCreator && (
                          <button
                            onClick={() =>
                              editingId === communityId
                                ? cancelEditing()
                                : startEditing({
                                    id: communityId,
                                    name: community.name,
                                    country: community.country,
                                    description: community.description,
                                    imageUrl: community.imageUrl,
                                  })
                            }
                            className="inline-flex items-center gap-2 border border-stellar-black/15 text-stellar-black/70 px-4 py-2 rounded-full font-semibold font-body text-xs hover:text-stellar-black hover:border-stellar-black/30 transition-all"
                          >
                            {editingId === communityId
                              ? t("cancelEdit")
                              : t("editCommunity")}
                          </button>
                        )}
                      </div>

                      {isCreator && editingId === communityId && (
                        <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                          <h3 className="text-xs font-semibold uppercase tracking-widest text-stellar-black/50 font-body mb-3">
                            {t("editTitle")}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/50 mb-2">
                                {t("form.name")}
                              </label>
                              <input
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white border border-stellar-black/15 rounded-xl text-stellar-black font-body text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/50 mb-2">
                                {t("form.country")}
                              </label>
                              <input
                                value={editForm.country}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    country: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white border border-stellar-black/15 rounded-xl text-stellar-black font-body text-sm"
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/50 mb-2">
                              {t("form.description")}
                            </label>
                            <textarea
                              value={editForm.description}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              rows={3}
                              className="w-full px-3 py-2 bg-white border border-stellar-black/15 rounded-xl text-stellar-black font-body text-sm resize-none"
                            />
                          </div>
                          <div className="mt-3">
                            <label className="block text-xs font-semibold font-body uppercase tracking-widest text-stellar-black/50 mb-2">
                              {t("editImage")}
                            </label>
                            <input
                              value={editForm.imageUrl}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  imageUrl: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-white border border-stellar-black/15 rounded-xl text-stellar-black font-body text-sm"
                            />
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <button
                              onClick={() => handleUpdateCommunity(communityId)}
                              className="inline-flex items-center gap-2 bg-stellar-teal text-white px-4 py-2 rounded-full font-semibold font-body text-xs hover:bg-stellar-teal/90 transition-all"
                            >
                              {t("saveChanges")}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-2 border border-stellar-black/15 text-stellar-black/60 px-4 py-2 rounded-full font-semibold font-body text-xs hover:text-stellar-black hover:border-stellar-black/30 transition-all"
                            >
                              {t("form.cancel")}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="bg-stellar-white rounded-xl p-4 border border-stellar-lilac/15">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-stellar-black/50 font-body mb-3">
                          {t("membersSection")}
                        </h3>
                        {membersCount === 0 ? (
                          <p className="text-sm text-stellar-black/50 font-body">
                            {t("noMembers")}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {community.members.map((member) => (
                              <span
                                key={member.address}
                                className="inline-flex items-center gap-2 bg-stellar-lilac/15 text-stellar-black rounded-full px-3 py-1 text-xs font-semibold font-body"
                              >
                                {member.address.slice(0, 5)}...
                                {member.address.slice(-4)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-stellar-white rounded-xl p-4 border border-stellar-teal/15">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-stellar-black/50 font-body mb-3">
                          {t("communityEvents")}
                        </h3>
                        {loadingEvents[communityId] ? (
                          <p className="text-sm text-stellar-black/50 font-body">
                            {t("loadingEvents")}
                          </p>
                        ) : events.length === 0 ? (
                          <p className="text-sm text-stellar-black/50 font-body">
                            {t("noEvents")}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {events.map((event) => (
                              <div
                                key={event.id}
                                className="flex items-center justify-between gap-3 bg-stellar-warm-grey/30 rounded-lg px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-stellar-black font-body truncate">
                                    {event.name}
                                  </p>
                                  <p className="text-xs text-stellar-black/50 font-body flex items-center gap-1">
                                    <CalendarDays size={11} />
                                    {new Date(event.date).toLocaleDateString(
                                      getDateLocale(),
                                    )}
                                  </p>
                                </div>
                                <span className="text-[11px] uppercase tracking-wide bg-stellar-teal/15 text-stellar-teal font-semibold px-2 py-0.5 rounded-full">
                                  {t("common:status.registered")}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Communities;
