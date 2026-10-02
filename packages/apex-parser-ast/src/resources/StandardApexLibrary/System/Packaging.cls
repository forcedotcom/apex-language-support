/**
 * Contains a method for obtaining information about managed and unlocked packages.
 * <p>Usage
 * In the context of a package, use the getCurrentPackageId method to retrieve the packageID.
 */
global class Packaging {
    global Object Packaging() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the context packageID in managed and unlocked packages.
     * <p>Usage
     * For managed packages, this method can be combined with isCurrentUserLicensedForPackage(packageId) to retrieve the packageId at runtime. Then, use packageId to confirm that the contextual user is licensed to use that managed package.
     */
    global static String getCurrentPackageId() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}