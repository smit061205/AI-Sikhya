import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import adminApi from "../api/adminApi";

const AdminProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    headline: "",
    bio: "",
    description: "",
    country: "",
    profession: "",
    socialLinks: { linkedin: "", twitter: "", github: "", website: "" },
    expertise: [],
  });
  const [expertiseInput, setExpertiseInput] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const mapAdminToForm = (data) => ({
    fullName: data.fullName || "",
    headline: data.headline || "",
    bio: data.bio || "",
    description: data.description || "",
    country: data.country || "",
    profession: data.profession || "",
    socialLinks: {
      linkedin: data.socialLinks?.linkedin || "",
      twitter: data.socialLinks?.twitter || "",
      github: data.socialLinks?.github || "",
      website: data.socialLinks?.website || "",
    },
    expertise: Array.isArray(data.expertise) ? data.expertise : [],
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await adminApi.get("/admin/profile");
      setProfile(data);
      setForm(mapAdminToForm(data));
      setPhotoPreview(data.profilePicture || data.profilePhoto?.url || "");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [name]: value },
    }));
  };

  const addExpertise = () => {
    const val = expertiseInput.trim();
    if (!val) return;
    setForm((prev) =>
      prev.expertise.includes(val)
        ? prev
        : { ...prev, expertise: [...prev.expertise, val] }
    );
    setExpertiseInput("");
  };

  const removeExpertise = (tag) => {
    setForm((prev) => ({
      ...prev,
      expertise: prev.expertise.filter((t) => t !== tag),
    }));
  };

  const handleExpertiseKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addExpertise();
    }
  };

  const resetForm = () => {
    if (!profile) return;
    setForm(mapAdminToForm(profile));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        fullName: form.fullName || undefined,
        headline: form.headline || undefined,
        bio: form.bio || undefined,
        description: form.description || undefined,
        country: form.country || undefined,
        profession: form.profession || undefined,
        socialLinks: form.socialLinks,
        expertise: form.expertise,
      };

      const { data } = await adminApi.patch("/admin/profile", payload);
      setSuccess("Profile updated successfully");
      if (data?.admin) {
        setProfile(data.admin);
        setForm(mapAdminToForm(data.admin));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("file", file);

      const { data } = await adminApi.put("/admin/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Profile photo updated");
      if (data?.admin) {
        setProfile(data.admin);
        const url =
          data.admin.profilePicture || data.admin.profilePhoto?.url || "";
        setPhotoPreview(url);
      } else if (data?.profilePhoto?.url) {
        setPhotoPreview(data.profilePhoto.url);
        setProfile((prev) => ({
          ...(prev || {}),
          profilePhoto: data.profilePhoto,
        }));
      } else {
        await fetchProfile();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const avatarInitial = (
    form.fullName ||
    profile?.fullName ||
    profile?.email ||
    "A"
  )
    .toString()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="bg-black text-white px-4 md:px-8 py-8 min-h-[70vh]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Profile</h1>
          <p className="text-gray-400 mt-1">
            Manage your instructor profile and account details.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md border border-red-700 bg-red-900/30 text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-md border border-emerald-700 bg-emerald-900/30 text-emerald-300">
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400">Loading profile...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Avatar & Basics */}
            <div className="bg-black border border-gray-700 rounded-2xl p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-28 h-28 rounded-full border border-gray-700 overflow-hidden bg-gray-800 flex items-center justify-center text-2xl font-bold">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-300">{avatarInitial}</span>
                  )}
                </div>
                <h2 className="mt-4 text-xl font-semibold">
                  {form.fullName || profile?.fullName || "Unnamed Admin"}
                </h2>
                <p className="text-gray-400 text-sm">{profile?.email}</p>

                <div className="w-full mt-5">
                  <label className="block text-left text-sm font-medium text-gray-400 mb-2">
                    Change profile photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={uploadingPhoto}
                    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-br file:from-cyan-200 file:to-cyan-300 file:text-black hover:file:opacity-90 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    PNG or JPG, up to ~5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Editable Form */}
            <form
              onSubmit={handleSave}
              className="lg:col-span-2 bg-black border border-gray-700 rounded-2xl p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm text-gray-400 mb-1"
                    htmlFor="fullName"
                  >
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="e.g., Alex Johnson"
                    className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm text-gray-400 mb-1"
                    htmlFor="headline"
                  >
                    Headline
                  </label>
                  <input
                    id="headline"
                    name="headline"
                    value={form.headline}
                    onChange={handleChange}
                    placeholder="e.g., Senior Instructor"
                    className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm text-gray-400 mb-1"
                    htmlFor="profession"
                  >
                    Profession
                  </label>
                  <input
                    id="profession"
                    name="profession"
                    value={form.profession}
                    onChange={handleChange}
                    placeholder="e.g., Software Engineer"
                    className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm text-gray-400 mb-1"
                    htmlFor="country"
                  >
                    Country
                  </label>
                  <input
                    id="country"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="e.g., United States"
                    className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label
                    className="block text-sm text-gray-400 mb-1"
                    htmlFor="bio"
                  >
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Short bio about you"
                    className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label
                    className="block text-sm text-gray-400 mb-1"
                    htmlFor="description"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Tell students more about your experience and what you teach (max 500 chars)"
                    className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Social Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm text-gray-400 mb-1"
                      htmlFor="linkedin"
                    >
                      LinkedIn
                    </label>
                    <input
                      id="linkedin"
                      name="linkedin"
                      value={form.socialLinks.linkedin}
                      onChange={handleSocialChange}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm text-gray-400 mb-1"
                      htmlFor="twitter"
                    >
                      Twitter
                    </label>
                    <input
                      id="twitter"
                      name="twitter"
                      value={form.socialLinks.twitter}
                      onChange={handleSocialChange}
                      placeholder="https://twitter.com/username"
                      className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm text-gray-400 mb-1"
                      htmlFor="github"
                    >
                      GitHub
                    </label>
                    <input
                      id="github"
                      name="github"
                      value={form.socialLinks.github}
                      onChange={handleSocialChange}
                      placeholder="https://github.com/username"
                      className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm text-gray-400 mb-1"
                      htmlFor="website"
                    >
                      Website
                    </label>
                    <input
                      id="website"
                      name="website"
                      value={form.socialLinks.website}
                      onChange={handleSocialChange}
                      placeholder="https://your-site.com"
                      className="w-full bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Expertise */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Expertise</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.expertise.length === 0 && (
                    <span className="text-gray-500 text-sm">
                      No expertise added yet
                    </span>
                  )}
                  {form.expertise.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 bg-gray-800 text-gray-200 border border-gray-700 rounded-full pl-3 pr-2 py-1 text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeExpertise(tag)}
                        className="text-gray-400 hover:text-white"
                        aria-label={`Remove ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={expertiseInput}
                    onChange={(e) => setExpertiseInput(e.target.value)}
                    onKeyDown={handleExpertiseKeyDown}
                    placeholder="Add expertise (press Enter)"
                    className="flex-1 bg-transparent border border-gray-700 rounded-2xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <motion.button
                    type="button"
                    onClick={addExpertise}
                    className="px-4 py-2 rounded-2xl text-black font-semibold bg-gradient-to-br from-cyan-200 to-cyan-300 hover:opacity-90"
                    whileTap={{ scale: 0.97 }}
                  >
                    Add
                  </motion.button>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <motion.button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-2xl text-black font-semibold bg-gradient-to-br from-cyan-200 to-cyan-300 hover:opacity-90 disabled:opacity-60"
                  whileTap={{ scale: 0.98 }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </motion.button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-2xl border border-gray-700 text-gray-300 hover:bg-gray-900"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProfile;
