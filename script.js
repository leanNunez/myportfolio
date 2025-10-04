window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        const position = section.getBoundingClientRect().top;
        if (position < window.innerHeight - 150) {
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const phoneNumber = "5493814627108"; // tu número sin el "+"
    const message = "¡Hola Leandro! Vi tu portafolio y me gustaría contactarte.";

    const btnWhatsapp = document.getElementById("btn-whatsapp");
    if (btnWhatsapp) {
        btnWhatsapp.addEventListener("click", (e) => {
            e.preventDefault();
            const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(url, "_blank");
        });
    }

    const btnWhatsappFloat = document.getElementById("btn-whatsapp-float");
    if (btnWhatsappFloat) {
        btnWhatsappFloat.addEventListener("click", (e) => {
            e.preventDefault();
            const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(url, "_blank");
        });
    }
});
