package com.example.wildvn.domain.species.repository;

import com.example.wildvn.domain.species.entity.PublishStatus;
import com.example.wildvn.domain.species.entity.Species;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SpeciesRepository extends JpaRepository<Species, UUID>, JpaSpecificationExecutor<Species> {
    long countByDeletedAtIsNull();
    long countByPublishStatusAndDeletedAtIsNull(PublishStatus publishStatus);
    Optional<Species> findBySlug(String slug);
    Optional<Species> findBySlugAndDeletedAtIsNull(String slug);
    List<Species> findAllBySlugInAndPublishStatusAndDeletedAtIsNull(Collection<String> slugs, PublishStatus publishStatus);
    List<Species> findByIsFeaturedTrueAndDeletedAtIsNull();
    List<Species> findTop9ByDeletedAtIsNullAndThumbnailUrlIsNotNullOrderByNameAsc();
    List<Species> findByConservationStatusAndDeletedAtIsNull(String conservationStatus);
    List<Species> findByCategoryOrHabitat(String category, String habitat);
    List<Species> findByEcosystemId(UUID ecosystemId);

    @Query(value = """
            SELECT CAST(s.conservation_status AS text), COUNT(*)
            FROM species s
            WHERE s.deleted_at IS NULL
            GROUP BY s.conservation_status
            ORDER BY CAST(s.conservation_status AS text)
            """, nativeQuery = true)
    List<Object[]> findConservationStatusFacets();

    @Query(value = """
            WITH RECURSIVE taxonomy_paths AS (
                SELECT t.id AS leaf_id, t.id, t.parent_id, t.rank, t.scientific_name
                FROM taxonomy t
                UNION ALL
                SELECT path.leaf_id, parent.id, parent.parent_id, parent.rank, parent.scientific_name
                FROM taxonomy_paths path
                JOIN taxonomy parent ON parent.id = path.parent_id
            )
            SELECT CASE path.scientific_name
                       WHEN 'Mammalia' THEN 'Thú'
                       WHEN 'Aves' THEN 'Chim'
                       WHEN 'Reptilia' THEN 'Bò sát'
                       WHEN 'Amphibia' THEN 'Lưỡng cư'
                       WHEN 'Actinopterygii' THEN 'Cá'
                   END,
                   COUNT(DISTINCT s.id)
            FROM species s
            JOIN taxonomy_paths path ON path.leaf_id = s.taxonomy_id
            WHERE s.deleted_at IS NULL
              AND path.rank = CAST('CLASS' AS "TaxonomyRank")
              AND path.scientific_name IN ('Mammalia', 'Aves', 'Reptilia', 'Amphibia', 'Actinopterygii')
            GROUP BY path.scientific_name
            ORDER BY CASE path.scientific_name
                         WHEN 'Mammalia' THEN 1
                         WHEN 'Aves' THEN 2
                         WHEN 'Reptilia' THEN 3
                         WHEN 'Amphibia' THEN 4
                         WHEN 'Actinopterygii' THEN 5
                     END
            """, nativeQuery = true)
    List<Object[]> findCategoryFacets();

    @Query(value = """
            SELECT CAST(s.diet_type AS text), COUNT(*)
            FROM species s
            WHERE s.deleted_at IS NULL
              AND s.diet_type IS NOT NULL
            GROUP BY s.diet_type
            ORDER BY CAST(s.diet_type AS text)
            """, nativeQuery = true)
    List<Object[]> findDietFacets();

    @Query(value = """
            SELECT CAST(habitat_values.value AS text), COUNT(*)
            FROM species s
            CROSS JOIN LATERAL unnest(s.habitat_type) AS habitat_values(value)
            WHERE s.deleted_at IS NULL
            GROUP BY habitat_values.value
            ORDER BY CAST(habitat_values.value AS text)
            """, nativeQuery = true)
    List<Object[]> findHabitatFacets();

    @Query(value = """
            SELECT CAST(s.activity_pattern AS text), COUNT(*)
            FROM species s
            WHERE s.deleted_at IS NULL
              AND s.activity_pattern IS NOT NULL
            GROUP BY s.activity_pattern
            ORDER BY CAST(s.activity_pattern AS text)
            """, nativeQuery = true)
    List<Object[]> findActivityPatternFacets();

    @Query(
            value = """
                    SELECT s.*
                    FROM species s
                    WHERE s.deleted_at IS NULL
                      AND (CAST(:query AS text) IS NULL
                           OR s.name_vn ILIKE CONCAT('%', CAST(:query AS text), '%')
                           OR s.scientific_name ILIKE CONCAT('%', CAST(:query AS text), '%'))
                      AND (CAST(:status AS varchar) IS NULL OR s.conservation_status = CAST(:status AS varchar))
                      AND (CAST(:diet AS text) IS NULL OR s.diet_type = CAST(:diet AS "DietType"))
                      AND (CAST(:habitat AS text) IS NULL OR CAST(:habitat AS "HabitatType") = ANY(s.habitat_type))
                      AND (CAST(:activityPattern AS text) IS NULL
                           OR s.activity_pattern = CAST(:activityPattern AS "ActivityPattern"))
                      AND (CAST(:tag AS text) IS NULL OR s.tags ILIKE CONCAT('%', CAST(:tag AS text), '%'))
                      AND (CAST(:taxonomyClass AS text) IS NULL OR EXISTS (
                          WITH RECURSIVE taxonomy_path AS (
                              SELECT t.id, t.parent_id, t.rank, t.scientific_name
                              FROM taxonomy t
                              WHERE t.id = s.taxonomy_id
                              UNION ALL
                              SELECT parent.id, parent.parent_id, parent.rank, parent.scientific_name
                              FROM taxonomy parent
                              JOIN taxonomy_path path ON path.parent_id = parent.id
                          )
                          SELECT 1
                          FROM taxonomy_path path
                          WHERE path.rank = CAST('CLASS' AS "TaxonomyRank")
                            AND path.scientific_name = CAST(:taxonomyClass AS text)
                      ))
                    ORDER BY s.name_vn ASC, s.id ASC
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM species s
                    WHERE s.deleted_at IS NULL
                      AND (CAST(:query AS text) IS NULL
                           OR s.name_vn ILIKE CONCAT('%', CAST(:query AS text), '%')
                           OR s.scientific_name ILIKE CONCAT('%', CAST(:query AS text), '%'))
                      AND (CAST(:status AS varchar) IS NULL OR s.conservation_status = CAST(:status AS varchar))
                      AND (CAST(:diet AS text) IS NULL OR s.diet_type = CAST(:diet AS "DietType"))
                      AND (CAST(:habitat AS text) IS NULL OR CAST(:habitat AS "HabitatType") = ANY(s.habitat_type))
                      AND (CAST(:activityPattern AS text) IS NULL
                           OR s.activity_pattern = CAST(:activityPattern AS "ActivityPattern"))
                      AND (CAST(:tag AS text) IS NULL OR s.tags ILIKE CONCAT('%', CAST(:tag AS text), '%'))
                      AND (CAST(:taxonomyClass AS text) IS NULL OR EXISTS (
                          WITH RECURSIVE taxonomy_path AS (
                              SELECT t.id, t.parent_id, t.rank, t.scientific_name
                              FROM taxonomy t
                              WHERE t.id = s.taxonomy_id
                              UNION ALL
                              SELECT parent.id, parent.parent_id, parent.rank, parent.scientific_name
                              FROM taxonomy parent
                              JOIN taxonomy_path path ON path.parent_id = parent.id
                          )
                          SELECT 1
                          FROM taxonomy_path path
                          WHERE path.rank = CAST('CLASS' AS "TaxonomyRank")
                            AND path.scientific_name = CAST(:taxonomyClass AS text)
                      ))
                    """,
            nativeQuery = true
    )
    Page<Species> findCatalog(
            @Param("query") String query,
            @Param("status") String status,
            @Param("diet") String diet,
            @Param("habitat") String habitat,
            @Param("activityPattern") String activityPattern,
            @Param("taxonomyClass") String taxonomyClass,
            @Param("tag") String tag,
            Pageable pageable
    );
}
