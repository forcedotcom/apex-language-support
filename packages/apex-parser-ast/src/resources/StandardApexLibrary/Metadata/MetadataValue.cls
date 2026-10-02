/**
 * An abstract base class that represents a custom metadata component field.
 * <p>Usage
 * You can’t create instances of this abstract class. Instead, create an instance of a specific custom metadata component value class that derives from Metadata.MetadataValue, such as Metadata.CustomMetadataValue.
 */
global abstract class MetadataValue {
    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}