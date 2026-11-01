import type { PermissionResolvable } from "discord.js";
import type { Category } from "./enum";

export interface SlashOptions {
    category?: Category;
    voiceOnly?: boolean;
    developersOnly?: boolean;
    contributorsOnly?: boolean;
    ownerOnly?: boolean;
    ignore?: boolean;
    global: boolean;
    cooldown?: string;
    sub?: boolean;
}

export interface BasePrefixOptions {
    description: string;
    usage?: string;
    aliases?: string[];
    category?: Category;
    voiceOnly?: boolean;
    ownerOnly?: boolean;
    clubOwnerOnly?: boolean;
    clubOperatorOnly?: boolean;
    developersOnly?: boolean;
    contributorsOnly?: boolean;
    ignore?: boolean;
    options?: string;
    hidden?: boolean;
    cooldown?: string;
    permissions?: PermissionResolvable | null;
}

export interface PrefixOptions extends BasePrefixOptions {
    category?: Category | keyof typeof Category;
    sub?: boolean;
}

export interface SubPrefixOptions extends BasePrefixOptions {
    parent: string;
    fullName?: string;
}
