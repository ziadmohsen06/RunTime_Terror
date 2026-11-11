// Decorator pattern (M1 class diagram: CareInstruction, CareDecorator, SteamDecorator,
// LowHeatDecorator). Every fabric starts from the same base instruction and is
// described by wrapping it in the decorators it needs, so a new rule is a new decorator.

export type IronSetting = 'low' | 'medium' | 'high';

export interface CareInstruction {
  ironTemperatureC(): number;
  setting(): IronSetting;
  steam(): boolean;
  text(): string;
}

export class BaseCare implements CareInstruction {
  ironTemperatureC(): number {
    return 150;
  }
  setting(): IronSetting {
    return 'medium';
  }
  steam(): boolean {
    return false;
  }
  text(): string {
    return 'Iron on a medium setting and test a hidden corner first.';
  }
}

export abstract class CareDecorator implements CareInstruction {
  constructor(protected readonly inner: CareInstruction) {}
  ironTemperatureC(): number {
    return this.inner.ironTemperatureC();
  }
  setting(): IronSetting {
    return this.inner.setting();
  }
  steam(): boolean {
    return this.inner.steam();
  }
  text(): string {
    return this.inner.text();
  }
}

export class LowHeatDecorator extends CareDecorator {
  ironTemperatureC(): number {
    return 110;
  }
  setting(): IronSetting {
    return 'low';
  }
  text(): string {
    return 'Iron on low heat. High heat can damage the fabric.';
  }
}

export class HighHeatDecorator extends CareDecorator {
  ironTemperatureC(): number {
    return 200;
  }
  setting(): IronSetting {
    return 'high';
  }
  text(): string {
    return 'Iron on high heat.';
  }
}

export class SteamDecorator extends CareDecorator {
  steam(): boolean {
    return true;
  }
  text(): string {
    return `${this.inner.text()} Use steam.`;
  }
}

export class NoSteamDecorator extends CareDecorator {
  steam(): boolean {
    return false;
  }
  text(): string {
    return `${this.inner.text()} Never use steam.`;
  }
}

export class InsideOutDecorator extends CareDecorator {
  text(): string {
    return `${this.inner.text()} Iron inside out.`;
  }
}

export class PressingClothDecorator extends CareDecorator {
  text(): string {
    return `${this.inner.text()} Use a pressing cloth.`;
  }
}
