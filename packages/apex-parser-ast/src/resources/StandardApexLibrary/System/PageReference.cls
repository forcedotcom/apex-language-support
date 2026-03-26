/**
 * A PageReference is a reference to an instantiation of a page. Among other attributes, PageReferences consist of a URL and a set of query parameter names and values.
 */
global class PageReference {

  public PageReference(String partialURL) {}

  public PageReference(SObject record) {}

  public static System.PageReference forResource(String resourceName, String path) {}

  public static System.PageReference forResource(String resourceName) {}

  public String getAnchor() {}

  public Blob getContent() {}

  public Blob getContentAsPDF() {}

  public Map<String, System.Cookie> getCookies() {}

  public Map<String, String> getHeaders() {}

  public Map<String, String> getParameters() {}

  public Boolean getRedirect() {}

  public Integer getRedirectCode() {}

  public String getUrl() {}

  public System.PageReference setAnchor(String anchor) {}

  public void setCookies(Cookie[] cookies) {}

  public System.PageReference setRedirect(Boolean redirect) {}

  public System.PageReference setRedirectCode(Integer redirectCode) {}

}