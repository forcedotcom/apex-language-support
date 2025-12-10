/**
 * Contains methods for the Id primitive data type.
 * Namespace: System
 * @see https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_id.htm
 */
public class Id {
	/**
	 * Returns the 15-character case-sensitive version of this Id.
	 * @return 15-character Id
	 */
	public String get15CharacterValue() { }

	/**
	 * Returns the 18-character case-insensitive version of this Id.
	 * @return 18-character Id
	 */
	public String get18CharacterValue() { }

	/**
	 * Returns the sObject type for this Id.
	 * @return sObject type
	 */
	public String getSObjectType() { }

	/**
	 * Returns a String representation of this Id.
	 * @return String representation
	 */
	public String toString() { }

	/**
	 * Returns the String representation of the Id argument.
	 * @param id The Id to convert
	 * @return String representation
	 */
	public static String valueOf(Id id) { }

}

