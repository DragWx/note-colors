/* Copyright (C) 2026 DragWx <https://github.com/DragWx> */

window.onload = init;

var noteSheet = new CSSStyleSheet();
var outputColors = {};
var outputBox;

function init() {
    outputBox = document.getElementById("outputBox");

    toggleOutputBox();
    updateColors();
    
    document.adoptedStyleSheets.push(noteSheet);
}

function toggleOutputBox() {
    var settings = document.forms["paletteSettings"];
    var outputBoxVisible = settings["outputBoxVisible"].checked;
    var outputContainer = document.getElementById("outputContainer");
    if (outputBoxVisible) {
        outputContainer.style.display = "";
    } else {
        outputContainer.style.display = "none";
    }
}

function updateColors() {
    var noteNames = ["C", "CS", "D", "DS", "E", "F", "FS", "G", "GS", "A", "AS", "B"];
    var noteSharps = [false, true, false, true, false, false, true, false, true, false, true, false];
    var noteText = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    outputColors = {};


    // Grab all of the settings from the control panel.
    var settings = document.forms["paletteSettings"];
    var order;  // Which note gets which color number.
    switch (settings["ordering"].value) {
        default:
        case "semitones":   // The next color is the next semitone in the scale.
            order = [0,1,2,3,4,5,6,7,8,9,10,11];
            break;
        case "fifths":      // The next color is the next fifth in the circle of fifths.
            order = [0,7,2,9,4,11,6,1,8,3,10,5];
            break;
    }
    var startAt = noteNames.indexOf(settings["startAt"].value); // Adjust the key of all of the examples.

    var hueDegrees = parseFloat(settings["hue"].value);         // Hue offset (degrees)
    var saturation = parseFloat(settings["saturation"].value);  // Saturation (0-1)
    var hueReversed = settings["reverse"].checked;              // Step through the color wheel backwards?
    var doubledA = settings["doubledA"].checked;                // Colors 0+1, 2+3, 4+5, etc are the same hue.
    var doubledB = settings["doubledB"].checked;                // Colors 1+2, 3+4, 5+6, etc are the same hue.

    var showNoteNames = settings["noteNames"].checked;          // Display note names.
    var showNoteBG = settings["noteBG"].checked;                // Display backgrounds behind notes. If disabled, note names are printed in BG color.
    var grayscale = settings["grayscale"].checked;              // Convert colors from RGB to grayscale (for experimenting and checking things)

    var darkOdds = settings["darkOdds"].checked;                // Every odd color index is darkened.
    var darkEvens = settings["darkEvens"].checked;              // Every even color index is darkened.
    var darkSharps = settings["darkSharps"].checked;            // Every sharp note is darkened.
    var darkNaturals = settings["darkNaturals"].checked;        // Every natural (non-sharp) note is darkened.
    var darkAmt = parseFloat(settings["darkAmt"].value);        // How much to darken, for even/odd darkening.
    
    var brightness = parseFloat(settings["brightness"].value);  // Brightness (Luma Y, 0-1)
    var contrast = parseFloat(settings["contrast"].value);      // Contrast (0-1)
    var varianceEnabled = settings["varianceEnabled"].checked;  // Vary luminance based on hue.
    var varianceAmt = varianceEnabled ? parseFloat(settings["varianceAmt"].value) : 0;  // Amount to vary luminance by, when varying from hue.
    var varianceDeg = parseFloat(settings["varianceDeg"].value);    // The phase of the hues to vary luminance by. (degrees)
    var varianceRad = varianceDeg * (Math.PI/180);              // The phase of the hues to vary luminance by. (radians, calculated)

    var sheetText = "";
    for (var i = 0; i < noteNames.length; i++) {
        var currIndex = (i + startAt) % noteNames.length        // The current note number (beginning from the `startAt` value)
        var isOddDark = (order[currIndex] % 2 == 1) && darkOdds;
        var isEvenDark = (order[currIndex] % 2 == 0) && darkEvens;
        var isSharpDark = noteSharps[currIndex] && darkSharps;
        var isNaturalDark = !noteSharps[currIndex] && darkNaturals;
        var isDark = isOddDark || isEvenDark || isSharpDark || isNaturalDark;   // Is even/odd/etc darkening applied to this note number?
        var currHueNumber = order[currIndex] - (doubledA ? currIndex % 2 : 0) + (doubledB ? currIndex % 2 : 0); // The current color number (offset by the `startAt` value)
        var currHueDegrees = (currHueNumber / noteNames.length) * 360;     // The current hue. (degrees)
        if (hueReversed) {
            currHueDegrees = 360 - currHueDegrees;
        }
        currHueDegrees += hueDegrees;
        var radians = currHueDegrees * (Math.PI/180);                  // The current hue. (radians, calculated)
        var u = Math.sin(-radians) * saturation * 0.5;
        var v = Math.cos( radians) * saturation * 0.5;
        var variance = Math.sin(radians + varianceRad) * -varianceAmt;
        var bgY = (brightness - (isDark ? darkAmt : 0)) - variance;
        var fgY = ((showNoteBG ? brightness + contrast : brightness) - (isDark ? darkAmt : 0) ) - variance;
        var bg = yuv2rgb(bgY, u, v, grayscale, true);
        var fg = yuv2rgb(fgY, u, v, grayscale, true);

        // Apply BG and FG color to notes.
        sheetText += `.note-${noteNames[i]} { background: ${showNoteBG ? bg : "transparent"}; color: ${fg}; }\n`;
        if (showNoteNames) {
            // Add note name to notes.
            sheetText += `.note-${noteNames[i]}::after { content: "${ noteText[currIndex] }"; font-weight: bold; }\n`;
        }

        // Add color to output.
        outputColors[noteText[i]] = { "bg": bg, "fg": fg };

    }
    noteSheet.replaceSync(sheetText);
    updateOutput();
}

function yuv2rgb(y, u, v, grayscale = false, gamutCorrect = false) {
    // This is YCC, specifically ITU-R BT.709. It's YUV but U and V are max 0.5.
    var R = y              + (1.5748*v);
    var G = y - (0.1873*u) - (0.4681*v);
    var B = y + (1.8556*u);
    var gray = y; //(0.2126*R) + (0.7152*G) + (0.0722*B);
    var ovr = (R > 1) || (G > 1) || (B > 1);
    if (grayscale) {
        R = gray;
        G = gray;
        B = gray;
    } else if (gamutCorrect && ovr) {
        // Desaturate to resulting RGB's luminance until everything's in range.
        var maxValue = Math.max(R, G, B, -R, -G, -B);
        R = ((R - gray) / maxValue) + gray;
        G = ((G - gray) / maxValue) + gray;
        B = ((B - gray) / maxValue) + gray;
    }
    if (R > 1) { R = 1; } else if (R < 0) { R = 0; }
    if (G > 1) { G = 1; } else if (G < 0) { G = 0; }
    if (B > 1) { B = 1; } else if (B < 0) { B = 0; }
    // Return CSS-ready color value.
    var out = "#";
    out += (R * 255 |0).toString(16).padStart(2,"0");
    out += (G * 255 |0).toString(16).padStart(2,"0");
    out += (B * 255 |0).toString(16).padStart(2,"0");
    return out;
}

function applyGamma(v) {
    if (v <= 0.04045) {
        return v / 12.92;
    } else {
        return Math.pow((v + 0.055) / 1.055, 2.4);
    }
}

function removeGamma(v) {
    if (v <= 0.0031308) {
        return 12.92 * v;
    } else {
        return (1.055 * Math.pow(v, 1/2.4)) - 0.055;
    }
}

function updateOutput() {
    var settings = document.forms["paletteSettings"];
    var pretty = settings["outputPretty"].checked ? 1 : 0;
    var trailingComma = settings["outputTrailingComma"].checked;
    var comment = settings["outputComment"].checked;
    var outputNames = settings["outputNames"].checked;
    var outputBg = settings["outputBg"].checked;
    var outputFg = settings["outputFg"].checked;
    var outText = "";
    var cells = [];
    if (outputNames) { cells.push("note"); };
    if (outputBg)    { cells.push("bg"); };
    if (outputFg)    { cells.push("fg"); };
    outText += cells.join(pretty ? ", " : ",") + (trailingComma ? "," : "") + "\n";
    var i = 0;
    for (var row in outputColors) {
        currNote = outputColors[row];
        var lastRow = ++i == Object.keys(outputColors).length;

        cells = [];
        if (outputNames) { cells.push(row.padEnd(2 * pretty, " ")); };
        if (outputBg)    { cells.push(currNote["bg"]) };
        if (outputFg)    { cells.push(currNote["fg"]) };
        outText += cells.join(pretty ? ", " : ",");
        outText += ((trailingComma && !lastRow) ? "," : "");
        outText += (comment ? ((trailingComma && lastRow) ? " " : "") + ` //${row}` : "")
        outText += "\n";
    }
    outputBox.innerText = outText;
}