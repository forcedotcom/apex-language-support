/**
 * A PageReference is a reference to an instantiation of a page. Among other attributes, PageReferences consist of a URL and a set of query parameter names and values.
 */
global class PageReference {

  global PageReference(String partialURL) {}

  global PageReference(SObject record) {}

  global static System.PageReference forResource(String resourceName, String path) {}

  global static System.PageReference forResource(String resourceName) {}

  global String getAnchor() {}

  global Blob getContent() {}

  global Blob getContentAsPDF() {}

  global Map<String, System.Cookie> getCookies() {}

  global Map<String, String> getHeaders() {}

  global Map<String, String> getParameters() {}

  global Boolean getRedirect() {}

  global Integer getRedirectCode() {}

  global String getUrl() {}

  global System.PageReference setAnchor(String anchor) {}

  global void setCookies(Cookie[] cookies) {}

  global System.PageReference setRedirect(Boolean redirect) {}

  global System.PageReference setRedirectCode(Integer redirectCode) {}

  global Object clone() {}

}