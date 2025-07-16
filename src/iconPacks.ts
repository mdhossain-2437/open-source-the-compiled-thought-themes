import * as vscode from "vscode";
import octicons = require("@primer/octicons");
import feather = require("feather-icons");

type OcticonType = {
  toSVG(): string;
};

interface FeatherIcon {
  toSvg(): string;
}

export interface IconDefinition {
  name: string;
  svg: string;
  tags: string[];
}

export class IconPackManager {
  private iconPacks: Map<string, IconDefinition[]> = new Map();

  constructor() {
    this.initializeDefaultPacks();
  }

  private initializeDefaultPacks() {
    // Initialize Octicons
    const octiconPack: IconDefinition[] = Object.entries(octicons).map(
      ([name, icon]: [string, OcticonType]) => ({
        name,
        svg: icon.toSVG(),
        tags: [name, ...name.split("-")],
      })
    );
    this.iconPacks.set("octicons", octiconPack);

    // Initialize Feather Icons
    const featherPack: IconDefinition[] = Object.entries(feather.icons).map(
      ([name, icon]: [string, FeatherIcon]) => ({
        name,
        svg: icon.toSvg(),
        tags: [name, ...name.split("-")],
      })
    );
    this.iconPacks.set("feather", featherPack);
  }

  public getIcon(packId: string, iconName: string): IconDefinition | undefined {
    const pack = this.iconPacks.get(packId);
    return pack?.find((icon) => icon.name === iconName);
  }

  public async loadCustomPack(packDefinition: {
    id: string;
    icons: Record<string, string>;
  }) {
    // Validate and load custom icon pack
    if (!this.validatePackDefinition(packDefinition)) {
      throw new Error("Invalid icon pack definition");
    }

    const { id, icons } = packDefinition;
    const customPack: IconDefinition[] = Object.entries(icons).map(
      ([name, svg]: [string, string]) => ({
        name,
        svg,
        tags: [name, ...name.split("-")],
      })
    );

    this.iconPacks.set(id, customPack);
  }

  private validatePackDefinition(
    packDefinition: any
  ): packDefinition is { id: string; icons: Record<string, string> } {
    return (
      packDefinition &&
      typeof packDefinition.id === "string" &&
      typeof packDefinition.icons === "object" &&
      Object.values(packDefinition.icons).every(
        (icon) => typeof icon === "string"
      )
    );
  }

  public getAllIcons(packId: string): IconDefinition[] {
    return this.iconPacks.get(packId) || [];
  }

  public searchIcons(query: string): IconDefinition[] {
    const results: IconDefinition[] = [];
    for (const pack of this.iconPacks.values()) {
      results.push(
        ...pack.filter((icon) =>
          icon.tags.some((tag) =>
            tag.toLowerCase().includes(query.toLowerCase())
          )
        )
      );
    }
    return results;
  }
}
