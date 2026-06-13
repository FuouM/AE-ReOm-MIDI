// @ts-nocheck
(function (api) {
    function safeProperty(group, nameOrIndex) {
        var prop;
        if (!group || !group.property) {
            return null;
        }
        try {
            prop = group.property(nameOrIndex);
            return prop || null;
        } catch (e) {
            return null;
        }
    }

    function layerFromProperty(prop) {
        var depth;
        if (!prop) {
            return null;
        }
        try {
            depth = prop.propertyDepth;
            while (depth > 0) {
                prop = prop.propertyGroup(1);
                depth -= 1;
            }
            if (prop && (prop.Effects || (prop.property && prop.property("ADBE Effect Parade")))) {
                return prop;
            }
        } catch (e) {}
        return null;
    }

    function propertyAxisName(property, axis) {
        var name;
        var matchName;
        if (!property) {
            return "";
        }
        try {
            name = String(property.name || "").toLowerCase();
            matchName = String(property.matchName || "");
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

    function isScaleProperty(property) {
        var matchName;
        var name;
        if (!property) {
            return false;
        }
        try {
            matchName = String(property.matchName || "");
            name = String(property.name || "").toLowerCase();
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

    function isNonMidiTargetLayer(layer) {
        var name;
        if (!layer) {
            return false;
        }
        name = String(layer.name || "");
        if (name.indexOf("MIDI Action") === 0) {
            return false;
        }
        return !api.isMidiImportSourceLayer(layer);
    }

    function scalePropertyForLayer(layer) {
        var transform;
        var scale;
        transform = safeProperty(layer, "ADBE Transform Group");
        if (!transform) {
            try {
                transform = layer.transform;
            } catch (transformErr) {}
        }
        scale = safeProperty(transform, "ADBE Scale");
        if (!scale) {
            scale = safeProperty(transform, "Scale");
        }
        return scale;
    }

    function scaleAxisProperty(layer, axis) {
        var scale;
        var names;
        var i;
        var prop;
        scale = scalePropertyForLayer(layer);
        if (!scale) {
            return null;
        }
        names = axis === "vertical" ? ["ADBE Scale Y", "Y", 2] : ["ADBE Scale X", "X", 1];
        for (i = 0; i < names.length; i += 1) {
            prop = safeProperty(scale, names[i]);
            if (prop) {
                return prop;
            }
        }
        return scale;
    }

    function selectedScaleProperty(comp, axis) {
        var properties;
        var i;
        var prop;
        var layer;
        var propAxis;
        if (!comp || !comp.selectedProperties || !comp.selectedProperties.length) {
            return null;
        }
        properties = comp.selectedProperties;
        for (i = 0; i < properties.length; i += 1) {
            prop = properties[i];
            if (!isScaleProperty(prop)) {
                continue;
            }
            layer = layerFromProperty(prop);
            if (!isNonMidiTargetLayer(layer)) {
                continue;
            }
            propAxis = propertyAxisName(prop, axis);
            if (propAxis && propAxis !== axis) {
                continue;
            }
            return prop;
        }
        return null;
    }

    function selectedNonMidiLayers(comp) {
        var layers = api.getCompSelectedLayers(comp);
        var out = [];
        var i;
        for (i = 0; i < layers.length; i += 1) {
            if (isNonMidiTargetLayer(layers[i])) {
                out.push(layers[i]);
            }
        }
        return out;
    }

    api.resolveScreenFlipTargetProperty = function (comp, axis) {
        var fromSelection;
        var layers;
        var layer;
        var property;
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

    api.applyScreenFlip = function (comp, axis, options) {
        var sourceLayer;
        var property;
        var resolved;
        var expression;
        var targetLayer;
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

    api.bakeScreenFlip = function (comp, axis, options) {
        var sourceLayer;
        var property;
        var resolved;
        var bakeResult;
        var targetLayer;
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
