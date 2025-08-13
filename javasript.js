document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const applicantCards = document.querySelectorAll('.applicant-card');
    const contentSections = document.querySelectorAll('.content-section');
    const backButton = document.getElementById('back-to-applicants');

    function showContent(targetId) {
        contentSections.forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(nav => nav.classList.remove('bg-[#2c4e3a]', 'active'));
            link.classList.add('bg-[#2c4e3a]', 'active');
            showContent(link.dataset.target);
        });
    });

    applicantCards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            navLinks.forEach(nav => nav.classList.remove('bg-[#2c4e3a]', 'active'));
            showContent(card.dataset.target);
        });
    });

    if (backButton) {
        backButton.addEventListener('click', () => {
            showContent('applicant-content');
            document.querySelector('[data-target="applicant-content"]').classList.add('bg-[#2c4e3a]', 'active');
        });
    }
});
