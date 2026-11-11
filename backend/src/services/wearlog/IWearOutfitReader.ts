// The only part of the Outfits module the Wear Log may use: read the user's saved outfits.
// OutfitService already has listOutfits. Nothing here can create or change an outfit.
export interface IWearOutfitReader {
  listOutfits(userId: number): Promise<Array<{ id: number; itemIds: number[] }>>;
}
