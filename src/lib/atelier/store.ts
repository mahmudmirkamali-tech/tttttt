import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  assemble,
  clamp,
  initialStudio,
  layerStamp,
  rollPieces,
  type Intensity,
  type Post,
  type StudioData,
} from "@/lib/atelier/model";

type Patch = Partial<StudioData["profile"]>;

type Store = StudioData & {
  setProfile: (patch: Patch) => void;
  setWeight: (layerId: string, valueId: string, weight: number) => void;
  setNote: (note: string) => void;
  setPublished: (appPublished: boolean) => void;
  setBlind: (blindMint: boolean) => void;
  setIntensity: (intensity: Intensity) => void;
  toggleLoop: (id: string) => void;
  toggleCheck: (id: string) => void;
  setPostStatus: (id: string, status: Post["status"]) => void;
  setPieceStory: (id: string, story: string) => void;
  compile: () => void;
  reroll: () => void;
  pushLog: (lines: string[]) => void;
};

function cleanProfile(current: StudioData["profile"], patch: Patch): StudioData["profile"] {
  const next = { ...current, ...patch };
  next.instagram = next.instagram.replace(/^@/, "");
  next.telegram = next.telegram.replace(/^@/, "");
  next.xHandle = next.xHandle.replace(/^@/, "");
  if (patch.supply != null) next.supply = clamp(Number(patch.supply), 8, 10000);
  if (patch.followers != null) next.followers = clamp(Number(patch.followers), 0, 5000000);
  if (patch.partnerFollowers != null) {
    next.partnerFollowers = clamp(Number(patch.partnerFollowers), 0, 5000000);
  }
  if (patch.storyShare != null) next.storyShare = clamp(Number(patch.storyShare), 1, 40);
  if (patch.inviteAccept != null) next.inviteAccept = clamp(Number(patch.inviteAccept), 5, 60);
  return next;
}

export const useAtelier = create<Store>()(
  persist(
    (set, get) => ({
      ...initialStudio(),
      setProfile: (patch) =>
        set((state) => ({ profile: cleanProfile(state.profile, patch) })),
      setWeight: (layerId, valueId, weight) =>
        set((state) => ({
          layers: state.layers.map((layer) =>
            layer.id !== layerId
              ? layer
              : {
                  ...layer,
                  values: layer.values.map((value) =>
                    value.id === valueId ? { ...value, weight: clamp(weight, 1, 80) } : value,
                  ),
                },
          ),
        })),
      setNote: (note) => set({ note }),
      setPublished: (appPublished) => {
        const built = assemble({ ...get(), appPublished }, "keep-arms");
        set({ appPublished, ...built });
      },
      setBlind: (blindMint) => {
        const built = assemble({ ...get(), blindMint }, "keep-arms");
        set({ blindMint, ...built });
      },
      setIntensity: (intensity) => {
        const built = assemble({ ...get(), intensity }, "reset-arms");
        set({ intensity, ...built });
      },
      toggleLoop: (id) => {
        const current = get();
        const loops = current.loops.map((loop) =>
          loop.id === id ? { ...loop, armed: !loop.armed } : loop,
        );
        const built = assemble({ ...current, loops }, "keep-arms");
        set(built);
      },
      toggleCheck: (id) =>
        set((state) => ({
          checks: state.checks.map((check) =>
            check.id === id ? { ...check, done: !check.done } : check,
          ),
        })),
      setPostStatus: (id, status) =>
        set((state) => ({
          posts: state.posts.map((post) => (post.id === id ? { ...post, status } : post)),
        })),
      setPieceStory: (id, story) =>
        set((state) => ({
          pieces: state.pieces.map((piece) => (piece.id === id ? { ...piece, story } : piece)),
        })),
      compile: () => set(assemble(get(), "keep-arms")),
      reroll: () => {
        const current = get();
        const seed = current.seed + 1;
        const pieces = rollPieces(current.layers, seed, current.profile);
        const rolledStamp = layerStamp(current.layers);
        const built = assemble({ ...current, seed, pieces }, "keep-arms");
        set({
          seed,
          pieces,
          rolledStamp,
          ...built,
          log: [...current.log, "هشت اثر با وزن‌های فعلی از نو چیده شد."].slice(-40),
        });
      },
      pushLog: (lines) =>
        set((state) => ({ log: [...state.log, ...lines].slice(-40) })),
    }),
    {
      name: "atelier-studio",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const data = persisted as Partial<StudioData>;
        if (!data.profile || !Array.isArray(data.pieces) || !Array.isArray(data.layers)) {
          return current;
        }
        return { ...current, ...data };
      },
    },
  ),
);
