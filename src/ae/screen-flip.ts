(function (api: ReOmMIDIApi) {
    function safeProperty(
        group: AePropertyTreeRoot | null,
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
            return (prop as PropContainerLike) || null;
        } catch (e) {
            return null;
        }
    }

    function layerFromProperty(prop: PropContainerLike | Property | null): Layer | null {
        var depth: number;
        var current: PropContainerLike | Property = prop;
        if (!current) {
            return null;
        }
        try {
            depth = (current as Property).propertyDepth;
            while (depth > 0) {
                current = (current as Property).propertyGroup(1) as PropContainerLike;
                depth -= 1;
            }
            if (
                current &&
                ((current as LayerWithEffects).Effects ||
                    (current.property && current.property("ADBE Effect Parade")))
            ) {
                return current as Layer;
            }
        } catch (e) {}
        return null;
    }

    function propertyAxisName(property: PropContainerLike | Property | null, axis: string): string {
        var name: string;
        var matchName: string;
        if (!property) {
            return "";
        }
        try {
            name = String((property as Property).name || "").toLowerCase();
            matchName = String((property as Property).matchName || "");
            if (axis === "vertical") {
                if (matchName === "ADBE Scale Y" || name === "y") {
                    return "vertical";
                }
            } else if (matchName === "ADBE Scale X" || name === "x") {
                return "horizontal";
            }
        } catch (e) {}
        return "";
    }

    function isScaleProperty(property: PropContainerLike | Property | null): boolean {
        var matchName: string;
        var name: string;
        if (!property) {
            return false;
        }
        try {
            matchName = String((property as Property).matchName || "");
            name = String((property as Property).name || "").toLowerCase();
            if (matchName === "ADBE Scale") {
                return true;
            }
            if (matchName === "ADBE Scale X" || matchName === "ADBE Scale Y") {
                return true;
            }
            return name === "scale" || name === "x" || name === "y";
        } catch (e) {}
        return false;
    }

    function isNonMidiTargetLayer(layer: Layer | null): boolean {
        var name: string;
        if (!layer) {
            return false;
        }
        name = String(layer.name || "");
        if (name.indexOf("MIDI Action") === 0) {
            return false;
        }
        return !api.isMidiImportSourceLayer(layer);
    }

    function scalePropertyForLayer(layer: Layer): PropContainerLike | null {
        var transform: PropContainerLike | null;
        var scale: PropContainerLike | null;
        transform = safeProperty(layer, "ADBE Transform Group");
        if (!transform) {
            try {
                transform = layer.transform as PropContainerLike;
            } catch (transformErr) {}
        }
        scale = safeProperty(transform, "ADBE Scale");
        if (!scale) {
            scale = safeProperty(transform, "Scale");
        }
        return scale;
    }

    function scaleAxisProperty(layer: Layer, axis: string): Property | null {
        var scale: PropContainerLike | null;
        var names: (string | number)[];
        var i: number;
        var prop: PropContainerLike | null;
        scale = scalePropertyForLayer(layer);
        if (!scale) {
            return null;
        }
        names = axis === "vertical" ? ["ADBE Scale Y", "Y", 2] : ["ADBE Scale X", "X", 1];
        for (i = 0; i < names.length; i += 1) {
            prop = safeProperty(scale, names[i]);
            if (prop) {
                return prop as Property;
            }
        }
        return scale as Property;
    }

    function selectedScaleProperty(comp: CompItem, axis: string): Property | null {
        var properties: _PropertyClasses[];
        var i: number;
        var prop: _PropertyClasses;
        var layer: Layer | null;
        var propAxis: string;
        if (!comp || !comp.selectedProperties || !comp.selectedProperties.length) {
            return null;
        }
        properties = comp.selectedProperties;
        for (i = 0; i < properties.length; i += 1) {
            prop = properties[i];
            if (!isScaleProperty(prop)) {
                continue;
            }
            layer = layerFromProperty(prop as Property);
            if (!isNonMidiTargetLayer(layer)) {
                continue;
            }
            propAxis = propertyAxisName(prop, axis);
            if (propAxis && propAxis !== axis) {
                continue;
            }
            return prop as Property;
        }
        return null;
    }

    function selectedNonMidiLayers(comp: CompItem): Layer[] {
        var layers = api.getCompSelectedLayers(comp);
        var out: Layer[] = [];
        var i: number;
        for (i = 0; i < layers.length; i += 1) {
            if (isNonMidiTargetLayer(layers[i])) {
                out.push(layers[i]);
            }
        }
        return out;
    }

    api.resolveScreenFlipTargetProperty = function (comp: CompItem, axis: string): Property {
        var fromSelection: Property | null;
        var layers: Layer[];
        var layer: Layer;
        var property: Property | null;
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before applying Screen Flip.");
        }
        axis = axis === "vertical" ? "vertical" : "horizontal";
        fromSelection = selectedScaleProperty(comp, axis);
        if (fromSelection) {
            return fromSelection;
        }
        layers = selectedNonMidiLayers(comp);
        if (layers.length > 1) {
            throw new Error("Select exactly one non-MIDI layer to receive the screen flip.");
        }
        if (!layers.length) {
            throw new Error("Select a non-MIDI layer or its Scale property to receive the screen flip.");
        }
        layer = layers[0];
        property = scaleAxisProperty(layer, axis);
        if (!property) {
            throw new Error('Could not access Transform > Scale on "' + layer.name + '".');
        }
        return property;
    };

    api.applyScreenFlip = function (
        comp: CompItem,
        axis: string,
        options?: MidiActionOptionsInput
    ): ScreenFlipResult {
        var sourceLayer: Layer;
        var property: Property;
        var resolved: MidiActionOptionsResolved;
        var expression: string;
        var targetLayer: Layer | null;
        sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
        property = api.resolveScreenFlipTargetProperty(comp, axis);
        resolved = api.resolveScreenFlipActionOptions(comp, property, axis, options, sourceLayer);
        expression = api.buildScreenFlipExpression(resolved);
        api.applyMidiActionExpressionToProperty(property, expression);
        targetLayer = layerFromProperty(property);
        return {
            sourceLayerName: sourceLayer.name,
            targetLayerName: targetLayer ? targetLayer.name : "(unknown)",
            propertyName: property.name,
            axis: resolved.screenFlipAxis
        };
    };

    api.bakeScreenFlip = function (
        comp: CompItem,
        axis: string,
        options?: MidiActionOptionsInput
    ): ScreenFlipResult {
        var sourceLayer: Layer;
        var property: Property;
        var resolved: MidiActionOptionsResolved;
        var bakeResult: BakePropertyResult;
        var targetLayer: Layer | null;
        sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
        property = api.resolveScreenFlipTargetProperty(comp, axis);
        resolved = api.resolveScreenFlipActionOptions(comp, property, axis, options, sourceLayer);
        bakeResult = api.bakeMidiActionToProperty(property, comp, sourceLayer, resolved);
        targetLayer = layerFromProperty(property);
        return {
            sourceLayerName: sourceLayer.name,
            targetLayerName: targetLayer ? targetLayer.name : "(unknown)",
            propertyName: property.name,
            axis: resolved.screenFlipAxis,
            triggers: bakeResult.triggers
        };
    };
})(ReOmMIDI);
