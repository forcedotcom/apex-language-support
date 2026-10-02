/**
 * Specifies the domain type for a System.Domain.
 * <p>Usage
 * Use the DomainType enum to obtain the type of a domain parsed through the System.DomainParser class.
 * <p>Enum Values
 * The following are the values of the System.DomainType enum. These values only apply to Salesforce-hosted domains.
 */
global enum DomainType {
    CMS_DOMAIN,
    CONTENT_DOMAIN,
    CUSTOMER_360_ADMIN_DOMAIN,
    CUSTOMER_360_DOMAIN,
    EXPERIENCE_CLOUD_SITES_BUILDER_DOMAIN,
    EXPERIENCE_CLOUD_SITES_DOMAIN,
    EXPERIENCE_CLOUD_SITES_LIVE_PREVIEW_DOMAIN,
    EXPERIENCE_CLOUD_SITES_PREVIEW_DOMAIN,
    LIGHTNING_CONTAINER_COMPONENT_DOMAIN,
    LIGHTNING_DOMAIN,
    ORG_MY_DOMAIN,
    SALESFORCE_SITES_DOMAIN,
    SETUP_DOMAIN,
    VISUALFORCE_DOMAIN

}