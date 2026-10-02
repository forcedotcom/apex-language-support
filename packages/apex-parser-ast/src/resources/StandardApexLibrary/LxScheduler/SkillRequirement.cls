/**
 * Contains information about the set of skills that are required to complete a particular task for a work type.
 * <p>Usage
 * The constructor for this class can’t be called directly. Create an instance of this class using the SkillRequirementBuilder.build() method.
 */
global without sharing class SkillRequirement {
    global Object SkillRequirement() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}