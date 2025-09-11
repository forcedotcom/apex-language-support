public class SystemUrl {
    public static System.Url getUrl() {
        return System.Url.getOrgDomainUrl().toExternalForm();
    }
}