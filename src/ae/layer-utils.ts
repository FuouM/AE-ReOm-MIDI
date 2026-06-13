(function (api: ReOmMIDIApi) {
    api.addSliderControl = function (layer: Layer, sliderName: string): Property {
        var effects = (layer as Layer & { Effects: PropertyGroup }).Effects;
        var effect = effects.addProperty("Slider Control");
        effect.name = sliderName;
        return effects.property(sliderName).property(1) as Property;
    };

    api.setHoldInterpolation = function (property: Property | null | undefined): void {
        var i: number;
        if (!property || !property.numKeys) {
            return;
        }
        for (i = 1; i <= property.numKeys; i += 1) {
            property.setInterpolationTypeAtKey(i, KeyframeInterpolationType.HOLD);
        }
    };
})(ReOmMIDI);
