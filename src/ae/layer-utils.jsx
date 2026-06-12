/* global ReOmMIDI, KeyframeInterpolationType */
(function (api) {
    api.addSliderControl = function (layer, sliderName) {
        var effect = layer.Effects.addProperty("Slider Control");
        effect.name = sliderName;
        return layer.Effects.property(sliderName).property(1);
    };

    api.setHoldInterpolation = function (property) {
        var i;
        if (!property || !property.numKeys) {
            return;
        }
        for (i = 1; i <= property.numKeys; i += 1) {
            property.setInterpolationTypeAtKey(i, KeyframeInterpolationType.HOLD);
        }
    };
})(ReOmMIDI);
