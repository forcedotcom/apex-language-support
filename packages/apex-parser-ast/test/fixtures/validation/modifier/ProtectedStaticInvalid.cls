/**
 * Protected static is invalid per Apex doc - protected only for instance methods and member variables.
 */
public class ProtectedStaticInvalid {
  protected static List<String> sharedList;

  protected static String getStaticValue() {
    return 'invalid';
  }
}
