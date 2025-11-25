// Seed data for Douala Tech Companies
const doualaJobs = [
    {
        id: 1,
        title: "Software Engineer",
        company: "Maviance PLC",
        location: "Douala, Cameroon",
        lat: 4.0511,
        lng: 9.7679, // Approximate center, would be better with exact coords
        description: "Fintech company providing digital financial services.",
        url: "https://maviance.com"
    },
    {
        id: 2,
        title: "Full Stack Developer",
        company: "ActiveSpaces",
        location: "Douala, Cameroon",
        lat: 4.0615,
        lng: 9.7050, // Approximate
        description: "Tech hub and incubator for startups.",
        url: "https://activespaces.com"
    },
    {
        id: 3,
        title: "IT Specialist",
        company: "Seven Academy",
        location: "Douala, Cameroon",
        lat: 4.0450,
        lng: 9.7100, // Approximate
        description: "Professional IT training institute.",
        url: "https://sevenadvancedacademy.com"
    },
    {
        id: 4,
        title: "Mobile Developer",
        company: "Njorku",
        location: "Douala, Cameroon",
        lat: 4.0550,
        lng: 9.7200, // Approximate
        description: "Job search engine for Africa.",
        url: "https://njorku.com"
    },
    {
        id: 5,
        title: "Web Developer",
        company: "Waspito",
        location: "Douala, Cameroon",
        lat: 4.0400,
        lng: 9.7300, // Approximate
        description: "Telehealth platform connecting patients to doctors.",
        url: "https://waspito.com"
    }
];

export const fetchJobs = async () => {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(doualaJobs);
        }, 500);
    });
};
