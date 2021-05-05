import { ListingMeta } from "../../common/Listable";
import { Spell } from "../../common/Spell";
import { StatBlock } from "../../common/StatBlock";
import { AccountClient } from "../Account/AccountClient";
import { Store } from "../Utility/Store";
import { Library } from "./Library";
import { SavedEncounter } from "../../common/SavedEncounter";
import { PersistentCharacter } from "../../common/PersistentCharacter";
import { now } from "moment";

export type UpdatePersistentCharacter = (
  persistentCharacterId: string,
  updates: Partial<PersistentCharacter>
) => void;
export interface Libraries {
  PersistentCharacters: Library<PersistentCharacter>;
  UpdatePersistentCharacter: UpdatePersistentCharacter;
  StatBlocks: Library<StatBlock>;
  Encounters: Library<SavedEncounter>;
  Spells: Library<Spell>;
}

export class AccountBackedLibraries {
  public PersistentCharacters: Library<PersistentCharacter>;
  public StatBlocks: Library<StatBlock>;
  public Encounters: Library<SavedEncounter>;
  public Spells: Library<Spell>;

  public async UpdatePersistentCharacter(
    persistentCharacterId: string,
    updates: Partial<PersistentCharacter>
  ) {
    if (updates.StatBlock) {
      updates.Name = updates.StatBlock.Name;
      updates.Path = updates.StatBlock.Path;
      updates.Version = updates.StatBlock.Version;
    }

    const currentCharacterListing = await this.PersistentCharacters.GetOrCreateListingById(
      persistentCharacterId
    );

    const currentCharacter = await currentCharacterListing.GetWithTemplate(
      PersistentCharacter.Default()
    );

    const updatedCharacter = {
      ...currentCharacter,
      ...updates,
      LastUpdateMs: now()
    };

    this.PersistentCharacters.SaveEditedListing(
      currentCharacterListing,
      updatedCharacter
    );
  }

  constructor(accountClient: AccountClient) {
    this.PersistentCharacters = new Library<PersistentCharacter>(
      Store.PersistentCharacters,
      "persistentcharacters",
      PersistentCharacter.Default,
      {
        accountSave: accountClient.SavePersistentCharacter,
        accountDelete: accountClient.DeletePersistentCharacter,
        getFilterDimensions: PersistentCharacter.GetFilterDimensions,
        getSearchHint: PersistentCharacter.GetSearchHint
      }
    );
    this.StatBlocks = new Library<StatBlock>(
      Store.StatBlocks,
      "statblocks",
      StatBlock.Default,
      {
        accountSave: accountClient.SaveStatBlock,
        accountDelete: accountClient.DeleteStatBlock,
        getFilterDimensions: StatBlock.FilterDimensions,
        getSearchHint: StatBlock.GetSearchHint
      }
    );
    this.Encounters = new Library<SavedEncounter>(
      Store.SavedEncounters,
      "encounters",
      SavedEncounter.Default,
      {
        accountSave: accountClient.SaveEncounter,
        accountDelete: accountClient.DeleteEncounter,
        getFilterDimensions: () => ({}),
        getSearchHint: SavedEncounter.GetSearchHint
      }
    );

    this.Spells = new Library<Spell>(
      Store.SavedEncounters,
      "spells",
      Spell.Default,
      {
        accountSave: accountClient.SaveSpell,
        accountDelete: accountClient.DeleteSpell,
        getFilterDimensions: Spell.GetFilterDimensions,
        getSearchHint: Spell.GetSearchHint
      }
    );

    this.initializeStatBlocks(accountClient);
    this.initializeSpells();
  }

  private initializeStatBlocks = async (accountClient: AccountClient) => {
    $.ajax("../statblocks/").done(listings => {
      if (!listings) {
        return;
      }
      return this.StatBlocks.AddListings(listings, "server");
    });

    const localStatBlocks = await Store.LoadAllAndUpdateIds(Store.StatBlocks);
    const listings = localStatBlocks.map(savedStatBlock => {
      const statBlock = {
        ...StatBlock.Default(),
        ...savedStatBlock
      };

      const listing: ListingMeta = {
        Id: statBlock.Id,
        Name: statBlock.Name,
        Path: statBlock.Path,
        SearchHint: StatBlock.GetSearchHint(statBlock),
        FilterDimensions: StatBlock.FilterDimensions(statBlock),
        Link: Store.StatBlocks,
        LastUpdateMs: statBlock.LastUpdateMs || 0
      };

      return listing;
    });
    this.StatBlocks.AddListings(listings, "localAsync");
    await accountClient.SaveAllUnsyncedItems(this, () => {});
  };

  private initializeSpells = async () => {
    $.ajax("../spells/").done(listings => {
      if (!listings) {
        return;
      }
      return this.Spells.AddListings(listings, "server");
    });

    const localSpells = await Store.LoadAllAndUpdateIds(Store.Spells);
    const newListings = localSpells.map(savedSpell => {
      const spell = {
        ...Spell.Default(),
        ...savedSpell
      };
      const listing: ListingMeta = {
        Id: savedSpell.Id,
        Name: spell.Name,
        Path: spell.Path,
        SearchHint: Spell.GetSearchHint(spell),
        FilterDimensions: Spell.GetFilterDimensions(spell),
        Link: Store.Spells,
        LastUpdateMs: spell.LastUpdateMs || 0
      };

      return listing;
    });

    this.Spells.AddListings(newListings, "localAsync");
  };
}
