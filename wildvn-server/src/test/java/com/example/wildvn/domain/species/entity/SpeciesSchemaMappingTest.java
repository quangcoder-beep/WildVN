package com.example.wildvn.domain.species.entity;

import com.example.wildvn.domain.taxonomy.entity.Taxonomy;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SpeciesSchemaMappingTest {

    @Test
    void mapsTheCrawlerSpeciesIdentityAndTaxonomyRelation() throws NoSuchFieldException {
        assertColumn("scientificName", "scientific_name", false);
        assertColumn("name", "name_vn", false);
        assertColumn("nameEn", "name_en", true);

        Field taxonomy = field("taxonomy");
        assertEquals(Taxonomy.class, taxonomy.getType());
        assertEquals(FetchType.LAZY, taxonomy.getAnnotation(ManyToOne.class).fetch());
        JoinColumn joinColumn = taxonomy.getAnnotation(JoinColumn.class);
        assertNotNull(joinColumn);
        assertEquals("taxonomy_id", joinColumn.name());
        assertFalse(joinColumn.nullable());
    }

    @Test
    void mapsStructuredCrawlerDataUsingNativePostgresTypes() throws NoSuchFieldException {
        assertNativeEnum("dietType", DietType.class);
        assertNativeEnum("activityPattern", ActivityPattern.class);
        assertNativeEnum("vnRedListStatus", VnRedListStatus.class);
        assertNativeEnum("citesAppendix", CitesAppendix.class);
        assertNativeEnum("vnDecreeStatus", VnDecreeStatus.class);
        assertNativeEnum("publishStatus", PublishStatus.class);

        assertEquals(HabitatType[].class, field("habitatTypes").getType());
        assertEquals(JsonNode.class, field("sourceReferences").getType());
        assertColumn("sourceReferences", "source_references", true);
        assertEquals(OffsetDateTime.class, field("deletedAt").getType());
        assertColumn("deletedAt", "deleted_at", true);
    }

    @Test
    void mapsImagesToTheSpeciesMediaTable() throws NoSuchFieldException {
        Field media = field("media");
        OneToMany relation = media.getAnnotation(OneToMany.class);
        assertNotNull(relation);
        assertEquals("species", relation.mappedBy());

        assertEquals(UUID.class, SpeciesMedia.class.getDeclaredField("id").getType());
        assertColumn(SpeciesMedia.class, "url", "url", false);
        assertNativeEnum(SpeciesMedia.class, "type", MediaType.class);
    }

    private Field field(String name) throws NoSuchFieldException {
        return Species.class.getDeclaredField(name);
    }

    private void assertColumn(String fieldName, String expectedColumn, boolean nullable)
            throws NoSuchFieldException {
        assertColumn(Species.class, fieldName, expectedColumn, nullable);
    }

    private void assertColumn(Class<?> type, String fieldName, String expectedColumn, boolean nullable)
            throws NoSuchFieldException {
        Column column = type.getDeclaredField(fieldName).getAnnotation(Column.class);
        assertNotNull(column);
        assertEquals(expectedColumn, column.name());
        assertEquals(nullable, column.nullable());
    }

    private void assertNativeEnum(String fieldName, Class<?> expectedType) throws NoSuchFieldException {
        assertNativeEnum(Species.class, fieldName, expectedType);
    }

    private void assertNativeEnum(Class<?> type, String fieldName, Class<?> expectedType)
            throws NoSuchFieldException {
        Field field = type.getDeclaredField(fieldName);
        assertEquals(expectedType, field.getType());
        Enumerated enumerated = field.getAnnotation(Enumerated.class);
        assertNotNull(enumerated);
        assertEquals(EnumType.STRING, enumerated.value());
    }

    private void assertFalse(boolean value) {
        assertTrue(!value);
    }
}
