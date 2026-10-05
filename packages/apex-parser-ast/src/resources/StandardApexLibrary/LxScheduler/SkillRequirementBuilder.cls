/**
 * Contains methods to build an instance of the lxscheduler.SkillRequirement class.
 * <p>A Builder object is obtained by invoking one of the SkillRequirementBuilder methods defined by the SkillRequirement class.
 */
global without sharing class SkillRequirementBuilder {
    global SkillRequirementBuilder() { }

    /**
     * Returns an instance of the lxscheduler.SkillRequirement object.
     */
    global lxscheduler.SkillRequirement build() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the skill that is required to complete a particular task for a work type. This is a required field.
     */
    global lxscheduler.SkillRequirementBuilder setSkillId(String skillId) { return null; }

    /**
     * Sets the level of the skill that is required to complete a particular task for a work type
     */
    global lxscheduler.SkillRequirementBuilder setSkillLevel(Double skillLevel) { return null; }

    global override virtual String toString() { return null; }
}