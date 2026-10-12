package com.example.wildvn.domain.taxonomy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TaxonomyMappingTest {

    @Test
    void mapsTheExistingTaxonomyTableAndSelfRelation() throws NoSuchFieldException {
        assertNotNull(Taxonomy.class.getAnnotation(Entity.class));

        Table table = Taxonomy.class.getAnnotation(Table.class);
        assertNotNull(table);
        assertEquals("taxonomy", table.name());
        assertTrue(hasUniqueNodeConstraint(table.uniqueConstraints()));

        Field id = field("id");
        assertEquals(UUID.class, id.getType());
        assertNotNull(id.getAnnotation(Id.class));
        assertNotNull(id.getAnnotation(GeneratedValue.class));

        Field parent = field("parent");
        ManyToOne parentRelation = parent.getAnnotation(ManyToOne.class);
        assertNotNull(parentRelation);
        assertEquals(FetchType.LAZY, parentRelation.fetch());
        assertEquals("parent_id", parent.getAnnotation(JoinColumn.class).name());
        assertEquals("parent", field("children").getAnnotation(OneToMany.class).mappedBy());
    }

    @Test
    void mapsTaxonomyColumnsAndRankAsTheirPostgresRepresentations() throws NoSuchFieldException {
        Field rank = field("rank");
        assertEquals(TaxonomyRank.class, rank.getType());
        assertEquals(EnumType.STRING, rank.getAnnotation(Enumerated.class).value());
        assertColumn("scientificName", "scientific_name", false, true);
        assertColumn("nameVn", "name_vn", true, true);

        assertEquals(OffsetDateTime.class, field("createdAt").getType());
        assertColumn("createdAt", "created_at", false, false);
        assertFalse(field("createdAt").getAnnotation(Column.class).updatable());
        assertEquals(OffsetDateTime.class, field("updatedAt").getType());
        assertColumn("updatedAt", "updated_at", false, true);
        assertEquals(OffsetDateTime.class, field("deletedAt").getType());
        assertColumn("deletedAt", "deleted_at", true, true);

        assertArrayEquals(new TaxonomyRank[]{
                TaxonomyRank.KINGDOM,
                TaxonomyRank.PHYLUM,
                TaxonomyRank.CLASS,
                TaxonomyRank.ORDER,
                TaxonomyRank.FAMILY,
                TaxonomyRank.GENUS
        }, TaxonomyRank.values());
    }

    private Field field(String name) throws NoSuchFieldException {
        return Taxonomy.class.getDeclaredField(name);
    }

    private void assertColumn(String fieldName, String expectedName, boolean nullable, boolean updatable)
            throws NoSuchFieldException {
        Column column = field(fieldName).getAnnotation(Column.class);
        assertNotNull(column);
        assertEquals(expectedName, column.name());
        assertEquals(nullable, column.nullable());
        assertEquals(updatable, column.updatable());
    }

    private boolean hasUniqueNodeConstraint(UniqueConstraint[] constraints) {
        return Arrays.stream(constraints)
                .anyMatch(constraint -> Arrays.equals(
                        new String[]{"parent_id", "scientific_name", "rank"},
                        constraint.columnNames()));
    }
}
