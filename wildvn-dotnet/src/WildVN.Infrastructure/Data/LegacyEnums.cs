namespace WildVN.Infrastructure.Data;

// Labels and spelling must match PostgreSQL enum values exactly.

public enum TaxonomyRank
{
    KINGDOM,
    PHYLUM,
    CLASS,
    ORDER,
    FAMILY,
    GENUS
}

public enum ConservationStatus
{
    EX,
    EW,
    CR,
    EN,
    VU,
    NT,
    LC,
    DD,
    NE
}

public enum MediaType
{
    IMAGE,
    AUDIO,
    VIDEO
}

public enum LocationType
{
    PROVINCE,
    ECO_REGION,
    NATIONAL_PARK
}

public enum DistributionType
{
    NATIVE,
    ENDEMIC,
    INVASIVE
}

public enum VnRedListStatus
{
    EX,
    EW,
    CR,
    EN,
    VU,
    NT,
    LC,
    DD,
    NE
}

public enum CitesAppendix
{
    I,
    II,
    III,
    NONE
}

public enum VnDecreeStatus
{
    GROUP_IA,
    GROUP_IB,
    GROUP_IIA,
    GROUP_IIB,
    NONE
}

public enum DietType
{
    CARNIVORE,
    HERBIVORE,
    OMNIVORE,
    INSECTIVORE,
    AUTOTROPH
}

public enum HabitatType
{
    TERRESTRIAL,
    FRESHWATER,
    MARINE,
    CANOPY
}

public enum ActivityPattern
{
    DIURNAL,
    NOCTURNAL,
    CREPUSCULAR
}

public enum PublishStatus
{
    DRAFT,
    PUBLISHED,
    ARCHIVED
}

public enum UserRole
{
    USER,
    ADMIN
}

public enum AuthProvider
{
    LOCAL,
    GOOGLE,
    FACEBOOK
}
