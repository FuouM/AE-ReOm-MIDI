/**
 * After Effects domain interfaces shared across ReOm MIDI modules.
 * Extends types-for-adobe where the shipped Layer / PropertyGroup types are incomplete.
 */

/**
 * Layer with effect-parade accessors missing from types-for-adobe Layer.
 * Use asLayerWithEffects() when navigating Effects / effect() from a plain Layer.
 */
interface LayerWithEffects extends Layer {
    Effects?: PropertyGroup & {
        addProperty(matchName: string): PropertyGroup;
        numProperties: number;
    };
    effect?(effectName: string): PropertyGroup & {
        (param: string | number): Property;
    };
}

/**
 * Property-tree node reachable via matchName/index navigation in helper utilities.
 * Structural subset of PropertyGroup / Property used instead of full AE typings.
 */
interface PropContainerLike {
    property?(nameOrIndex: string | number): PropContainerLike | Property | PropertyGroup | null;
    setValue?(value: number | number[] | string): void;
    addProperty?(matchName: string): PropContainerLike | PropertyGroup;
    numProperties?: number;
    name?: string;
    matchName?: string;
}

/** Root object accepted by piano-roll layout helpers when a full CompItem is unavailable. */
interface PianoRollCompLike {
    width?: number;
    height?: number;
    duration?: number;
    frameDuration?: number;
    workAreaStart?: number;
    workAreaDuration?: number;
}

/** Slider property with ExtendScript keyframe accessors used by import and expression modules. */
interface SliderPropertyLike extends Property {
    key?(index: number): SliderKeyFrame;
    keyTime?(index: number): number;
    keyValue?(index: number): number;
    numKeys?: number;
    valueAtTime?(time: number, pre: boolean): number;
}

/** Layer or property group passed into matchName navigation helpers. */
type AePropertyTreeRoot = Layer | PropContainerLike;
