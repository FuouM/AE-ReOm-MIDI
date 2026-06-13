function reomScriptThis(thisObj: unknown): Panel | Window | undefined {
    return thisObj as Panel | Window | undefined;
}

function asScriptUiPenHost(g: ScriptUIGraphics): ScriptUIGraphicsPenHost {
    return g as unknown as ScriptUIGraphicsPenHost;
}

(function (api: ReOmMIDIApi) {
    api.isPropContainerLike = function (value: unknown): value is PropContainerLike {
        if (!value || typeof value !== "object") {
            return false;
        }
        var candidate = value as PropContainerLike;
        return (
            typeof candidate.property === "function" ||
            typeof candidate.setValue === "function" ||
            typeof candidate.addProperty === "function"
        );
    };

    api.isSliderPropertyLike = function (value: unknown): value is SliderPropertyLike {
        if (!value || typeof value !== "object") {
            return false;
        }
        var candidate = value as SliderPropertyLike;
        return typeof candidate.key === "function" || typeof candidate.keyTime === "function";
    };

    api.asPropContainerLike = function (value: unknown): PropContainerLike | null {
        return api.isPropContainerLike(value) ? value : null;
    };

    api.asLayerWithEffects = function (layer: Layer | null | undefined): LayerWithEffects | null {
        if (!layer) {
            return null;
        }
        return layer as LayerWithEffects;
    };

    api.safeProperty = function (
        group: AePropertyTreeRoot | null | undefined,
        nameOrIndex: string | number
    ): PropContainerLike | null {
        var prop: PropContainerLike | Property | PropertyGroup | null;
        if (!group || !group.property) {
            return null;
        }
        try {
            if (typeof nameOrIndex === "number") {
                prop = group.property(nameOrIndex);
            } else {
                prop = group.property(nameOrIndex);
            }
            return prop ? (prop as PropContainerLike) : null;
        } catch (e) {
            return null;
        }
    };
})(ReOmMIDI);
