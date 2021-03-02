import * as React from "react";
import { Settings } from "../../../common/Settings";
import { StatBlock } from "../../../common/StatBlock";
import { VariantMaximumHP } from "../../Combatant/GetOrRollMaximumHP";
import { linkComponentToObservables } from "../../Combatant/linkComponentToObservables";
import { LibrariesCommander } from "../../Commands/LibrariesCommander";
import { StatBlockComponent } from "../../Components/StatBlock";
import { CurrentSettings } from "../../Settings/Settings";
import { TextEnricher } from "../../TextEnricher/TextEnricher";
import { GetAlphaSortableLevelString } from "../../Utility/GetAlphaSortableLevelString";
import { Listing } from "../Listing";
import { StatBlockLibrary } from "../StatBlockLibrary";
import { ListingGroupFn } from "../Components/BuildListingTree";
import { LibraryReferencePane } from "./LibraryReferencePane";
import { ExtraButton, ListingRow } from "../Components/ListingRow";

export type StatBlockLibraryReferencePaneProps = {
  librariesCommander: LibrariesCommander;
  library: StatBlockLibrary;
  statBlockTextEnricher: TextEnricher;
};

type StatBlockListing = Listing<StatBlock>;

interface State {
  filter: string;
  groupingFunctionIndex: number;
  previewedStatBlock: StatBlock;
  previewIconHovered: boolean;
  previewWindowHovered: boolean;
  previewPosition: { left: number; top: number };
}

export class StatBlockLibraryReferencePane extends React.Component<
  StatBlockLibraryReferencePaneProps,
  State
> {
  constructor(props: StatBlockLibraryReferencePaneProps) {
    super(props);
    this.state = {
      filter: "",
      groupingFunctionIndex: 0,
      previewedStatBlock: StatBlock.Default(),
      previewIconHovered: false,
      previewWindowHovered: false,
      previewPosition: { left: 0, top: 0 }
    };

    linkComponentToObservables(this);
  }

  public render() {
    const listings = this.props.library.GetStatBlocks();

    return (
      <LibraryReferencePane
        defaultItem={StatBlock.Default()}
        listings={listings}
        renderListingRow={this.renderListingRow(CurrentSettings())}
        groupByFunctions={this.groupingFunctions}
        addNewItem={() =>
          this.props.librariesCommander.CreateAndEditStatBlock(
            this.props.library
          )
        }
        launchQuickAddPrompt={() =>
          this.props.librariesCommander.LaunchQuickAddPrompt()
        }
        renderPreview={statBlock => (
          <StatBlockComponent statBlock={statBlock} displayMode="default" />
        )}
      />
    );
  }

  private groupingFunctions: ListingGroupFn[] = [
    l => ({
      key: l.Listing().Path
    }),
    l => ({
      label: "Challenge " + l.Listing().Metadata.Level,
      key: GetAlphaSortableLevelString(l.Listing().Metadata.Level)
    }),
    l => ({
      key: l.Listing().Metadata.Source?.split(",")[0]
    }),
    l => ({
      key: l.Listing().Metadata.Type
    })
  ];

  private renderListingRow = (settings: Settings) => (
    l: Listing<StatBlock>,
    onPreview,
    onPreviewOut
  ) => {
    const storedListing = l.Listing();
    return (
      <ListingRow
        key={storedListing.Id + storedListing.Path + storedListing.Name}
        name={storedListing.Name}
        showCount
        onAdd={this.loadSavedStatBlock(VariantMaximumHP.DEFAULT)}
        onEdit={this.editStatBlock}
        onPreview={onPreview}
        onPreviewOut={onPreviewOut}
        listing={l}
        extraButtons={
          settings.Rules.EnableBossAndMinionHP && this.bossAndMinionButtons
        }
      />
    );
  };

  private loadSavedStatBlock = (variantMaximumHP: VariantMaximumHP) => (
    listing: StatBlockListing,
    hideOnAdd: boolean
  ) => {
    return this.props.librariesCommander.AddStatBlockFromListing(
      listing,
      hideOnAdd,
      variantMaximumHP
    );
  };

  private editStatBlock = (l: Listing<StatBlock>) => {
    l.Listing.subscribe(_ => this.forceUpdate());
    this.props.librariesCommander.EditStatBlock(l, this.props.library);
  };

  private bossAndMinionButtons: ExtraButton<StatBlock>[] = [
    {
      faClass: "chess-pawn",
      buttonClass: "minion",
      title: "Add with 1 HP",
      onClick: this.loadSavedStatBlock(VariantMaximumHP.MINION)
    },
    {
      faClass: "crown",
      buttonClass: "boss",
      title: "Add with maximum HP",
      onClick: this.loadSavedStatBlock(VariantMaximumHP.BOSS)
    }
  ];
}