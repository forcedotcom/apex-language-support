/**
 * Fixture for chained TypeReference + position-based reference resolution
 * (W-22692425). Declares a nested class so that a qualified type reference
 * (GeocodingService.GeocodingAddress) has a resolvable inner segment, plus an
 * overloaded method (process(Integer) vs process(String)).
 */
global class ChainedRefTestClass {
  global class GeocodingAddress {
    public String street;
  }

  public void useQualifiedType() {
    ChainedRefTestClass.GeocodingAddress addr =
      new ChainedRefTestClass.GeocodingAddress();
  }

  public Integer process(Integer value) {
    return value;
  }

  public String process(String value) {
    return value;
  }

  public void callOverloads() {
    process(42);
    process('hello');
  }
}
