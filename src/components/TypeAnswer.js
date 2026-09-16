import React, { useMemo, useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Platform } from "react-native";
import { colors, spacing, radius, type, elevation, hairline, buttonHeight, onFill } from "../theme";
import PressableTint from "./PressableTint";
import { suggestAnswers } from "../game/answerMatch";
import { ANSWER_SUGGESTION_LIMIT } from "../constants";

// The typed answer surface (M2.12 step 3) — Medium and Hard for every mode
// whose answer is a name.
//
// One component for both tiers, because the ONLY difference between them is
// whether suggestions are shown. Two components would be the same 120 lines
// twice, and the pair would drift the first time the submit behaviour changed.
//
// All the matching lives in game/answerMatch.js; this file decides nothing
// about whether an answer is right. It collects a string and hands it up.
export default function TypeAnswer({
  suggest = false,
  pool = [],
  answered = false,
  result = null,
  correct = null,
  submitted = "",
  onSubmit,
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  // Recomputed per keystroke, which is why suggestAnswers is prefix-first and
  // non-fuzzy — it runs against the whole answer set on every character.
  const suggestions = useMemo(
    () => (suggest && !answered ? suggestAnswers(value, pool, ANSWER_SUGGESTION_LIMIT) : []),
    [suggest, value, pool, answered]
  );

  const submit = (v) => {
    const text = (v ?? value).trim();
    if (!text || answered) return;
    onSubmit(text);
  };

  if (answered) {
    // After the answer, the field becomes a read-back. A "close" result says so
    // explicitly and shows the spelling — the point of accepting a typo is to
    // keep someone moving, but they should still leave knowing how it is
    // actually spelled, which a silent tick would not teach.
    const tone =
      result === "match"
        ? styles.resolvedRight
        : result === "close"
          ? styles.resolvedClose
          : styles.resolvedWrong;
    return (
      <View style={[styles.resolved, tone]}>
        <Text style={styles.resolvedTyped}>{submitted || "No answer"}</Text>
        {result === "close" && (
          <Text style={styles.resolvedNote}>Close enough — it&apos;s spelled {correct}</Text>
        )}
        {result === "miss" && <Text style={styles.resolvedNote}>The answer was {correct}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={() => submit()}
        placeholder={suggest ? "Start typing…" : "Type your answer"}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        // The browser's own autofill/autocomplete would offer previously typed
        // answers across questions, which on Hard is exactly the assist this
        // tier exists to remove.
        autoComplete="off"
        {...(Platform.OS === "web" ? { autoCompleteType: "off", spellCheck: false } : null)}
        returnKeyType="done"
        accessibilityLabel="Type your answer"
      />

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setValue(s);
                submit(s);
              }}
              style={styles.suggestion}
              accessibilityRole="button"
              accessibilityLabel={`Answer ${s}`}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <PressableTint
        onPress={() => submit()}
        disabled={!value.trim()}
        radius={radius.pill}
        style={[styles.submit, !value.trim() && styles.submitIdle]}
        accessibilityRole="button"
        accessibilityLabel="Submit answer"
      >
        <Text style={styles.submitText}>Answer</Text>
      </PressableTint>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing(2) },
  input: {
    ...type.body,
    fontSize: 17,
    height: buttonHeight,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sheet,
    paddingHorizontal: spacing(4),
    ...hairline,
    ...elevation(1),
  },

  // Suggestions are a list of real answers, so they get the card treatment
  // rather than a floating dropdown — on a phone a dropdown would cover the
  // flag the question is about.
  suggestions: { marginTop: spacing(2), gap: spacing(1) },
  suggestion: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.card,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    ...hairline,
  },
  suggestionText: { ...type.body },

  submit: {
    marginTop: spacing(3),
    height: buttonHeight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
  },
  // Quieted rather than greyed — the kit has no disabled grey.
  submitIdle: { opacity: 0.45 },
  submitText: { ...type.label, fontSize: 15, color: onFill(colors.brand) },

  resolved: {
    marginTop: spacing(2),
    borderRadius: radius.sheet,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    ...hairline,
  },
  // The kit shows a resolved answer as a tinted card with a coloured label,
  // not a saturated fill.
  resolvedRight: { backgroundColor: colors.successSurface },
  resolvedClose: { backgroundColor: colors.emberSurface },
  resolvedWrong: { backgroundColor: colors.dangerSurface },
  resolvedTyped: { ...type.h3, fontSize: 18 },
  resolvedNote: { ...type.caption, marginTop: spacing(1) },
});
