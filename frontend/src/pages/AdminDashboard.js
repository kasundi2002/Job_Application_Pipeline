import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [cvs, setCvs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/admin");
    }
  }, [navigate]);

  useEffect(() => {
    fetchCvs();
  }, []);

  const fetchCvs = async () => {
    try {
      const response = await axios.get("https://your-backend.onrender.com/admin/cvs", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, // Secure API access
      });
      setCvs(response.data);
    } catch (error) {
      console.error("Error fetching CVs:", error);
    }
  };

  // Filter CVs based on search input
  const filteredCvs = cvs.filter((cv) =>
    cv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cv.education.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <h2>Admin Dashboard - CVs</h2>
      
      <input
        type="text"
        placeholder="Search by Name, Email, Education..."
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Education</th>
            <th>Qualifications</th>
            <th>Projects</th>
            <th>CV</th>
            <th>Submitted At</th>
          </tr>
        </thead>
        <tbody>
          {filteredCvs.length > 0 ? (
            filteredCvs.map((cv, index) => (
              <tr key={index}>
                <td>{cv.name}</td>
                <td>{cv.email}</td>
                <td>{cv.phone}</td>
                <td>{cv.education}</td>
                <td>{cv.qualifications}</td>
                <td>{cv.projects}</td>
                <td>
                  <a href={cv.cvLink} target="_blank" rel="noopener noreferrer">
                    View CV
                  </a>
                </td>
                <td>{cv.submittedAt}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8">No CVs found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
