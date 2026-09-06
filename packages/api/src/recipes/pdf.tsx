import { createRequire } from "node:module";
import type { RecipeContent } from "@prep-sheet/db/recipe-content";
import {
  Document,
  Font,
  Link,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

const require = createRequire(import.meta.url);
Font.register({
  family: "Nunito",
  fonts: [
    {
      src: require.resolve(
        "@fontsource/nunito/files/nunito-latin-400-normal.woff",
      ),
      fontWeight: 400,
    },
    {
      src: require.resolve(
        "@fontsource/nunito/files/nunito-latin-800-normal.woff",
      ),
      fontWeight: 800,
    },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingLeft: 44,
    paddingRight: 44,
    paddingBottom: 58,
    fontFamily: "Nunito",
    fontSize: 11,
    color: "#263b32",
    lineHeight: 1.5,
  },
  brand: { fontSize: 12, fontWeight: 800, color: "#47754c", marginBottom: 24 },
  title: { fontSize: 29, fontWeight: 800, lineHeight: 1.15, marginBottom: 12 },
  description: { color: "#5f665c", marginBottom: 16 },
  meta: {
    backgroundColor: "#f1f4e7",
    padding: 12,
    marginBottom: 20,
    borderRadius: 6,
  },
  heading: { fontSize: 15, fontWeight: 800, marginTop: 16, marginBottom: 10 },
  ingredient: { marginBottom: 5, paddingLeft: 12 },
  step: { flexDirection: "row", marginBottom: 12 },
  number: { width: 25, fontWeight: 800, color: "#47754c" },
  stepText: { flex: 1 },
  note: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fff5dd",
    borderRadius: 6,
  },
  source: { fontSize: 9, marginTop: 20, color: "#5f665c" },
});

export async function recipePdf(
  content: RecipeContent,
  sourceUrl: string | null,
  origin: string,
) {
  const meta = [
    content.servings && `Serves ${content.servings}`,
    content.prepMinutes !== null && `Prep ${content.prepMinutes} min`,
    content.cookMinutes !== null && `Cook ${content.cookMinutes} min`,
  ]
    .filter(Boolean)
    .join("    /    ");
  return renderToBuffer(
    <Document title={content.title} author="Prep Sheet">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>prep sheet. / THE KITCHEN COPY</Text>
        <Text style={s.title}>{content.title}</Text>
        {content.description && (
          <Text style={s.description}>{content.description}</Text>
        )}
        {meta && <Text style={s.meta}>{meta}</Text>}
        <Text style={s.heading} minPresenceAhead={30}>
          What goes in
        </Text>
        {content.ingredients.map((item, index) => (
          <Text key={`${index}-${item}`} style={s.ingredient}>
            • {item}
          </Text>
        ))}
        <Text style={s.heading} minPresenceAhead={50}>
          Let's make it
        </Text>
        {content.steps.map((step, index) => (
          <View key={`${index}-${step}`} style={s.step} wrap={false}>
            <Text style={s.number}>{index + 1}.</Text>
            <Text style={s.stepText}>{step}</Text>
          </View>
        ))}
        {content.notes && (
          <View style={s.note}>
            <Text style={{ fontWeight: 800 }}>Kitchen notes</Text>
            <Text>{content.notes}</Text>
          </View>
        )}
        {sourceUrl && (
          <Text style={s.source}>
            Original recipe: <Link src={sourceUrl}>{sourceUrl}</Link>
          </Text>
        )}
        {origin === "generated" && (
          <Text style={s.source}>
            AI-generated recipe. Review the ingredients and method before
            cooking.
          </Text>
        )}
      </Page>
    </Document>,
  );
}
