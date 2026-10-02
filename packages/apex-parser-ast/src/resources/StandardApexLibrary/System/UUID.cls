/**
 * Contains methods to randomly generate a version 4 universally unique identifier (UUID), compare UUIDs, and convert UUID instance to a string.
 * <p>Usage
 * The UUID is generated using a cryptographically strong pseudo-random number generator and is represented as 32 hexadecimal values.
 */
global class UUID {
    /**
     * Compares a UUID instance with the specified object and returns true if both are equal. Otherwise, returns false.
     * <p>Example
     * // UUIDs are equal when all the characters in the UUID are the same
     * String uuidStr = '707b2538-98bb-41e7-95e3-1d77bf42b102';
     * UUID fromStr = UUID.fromString(uuidStr);
     * UUID fromStr2 = UUID.fromString(uuidStr);
     * Assert.isTrue(fromStr.equals(fromStr2));
     *
     * // A UUID is never equal to a String or any non-UUID object
     * Assert.isFalse(fromStr.equals(uuidStr));
     */
    global Boolean equals(Object o) { return false; }

    /**
     * Converts a 32 character hexadecimal string representation of a UUID to a UUID instance.
     * <p>Example
     * String uuidStr = '707b2538-98bb-41e7-95e3-1d77bf42b102';
     * UUID fromStr = UUID.fromString(uuidStr);
     *
     * UUID.fromString(null); // Throws NullPointerException
     *
     * UUID.fromString(‘not a uuid’); // Throws IllegalArgumentException
     */
    global static System.UUID fromString(String str) { return null; }

    /**
     * Returns the hashcode corresponding to the UUID instance.
     */
    global Integer hashCode() { return 0; }

    /**
     * A static method that randomly generates a version 4 UUID.
     * <p>Example
     * UUID randomUUID = UUID.randomUUID();
     * system.debug(randomUUID); // Prints the UUID string that was randomly generated
     * @return A 32 hexadecimal value of the UUID generated.
     */
    global static System.UUID randomUUID() { return null; }

    /**
     * Returns the string representation of the UUID instance.
     */
    global override String toString() { return null; }
}