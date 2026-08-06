// Single source of truth: only ONE listener, on form submit.
// Delete the old resetBtn 'click' listener AND the old resetForm 'submit'
// listener entirely — replace both with this one block.

document.getElementById('resetForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const loadingMessage = document.getElementById('loadingMessage');
    const successMessage = document.getElementById('successMessage');
    const emailError = document.getElementById('emailError');
    const email = document.getElementById('email').value;

    // Hide previous messages
    emailError.style.display = 'none';
    successMessage.style.display = 'none';

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.style.display = 'block';
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.style.display = 'none';
    loadingMessage.style.display = 'block';

    try {
        // IMPORTANT: replace with your actual deployed backend URL,
        // e.g. 'https://your-backend.onrender.com/api/forget-password'
        // A relative path only works if frontend + backend share the same origin.
        const response = await fetch('https://your-backend.onrender.com/api/forget-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        loadingMessage.style.display = 'none';
        submitBtn.style.display = 'block';
        submitBtn.disabled = false;

        if (!response.ok || !data.message) {
            emailError.textContent = data.message || 'This email is not found';
            emailError.style.display = 'block';
            return;
        }

        successMessage.style.display = 'block';
        successMessage.innerText = 'Password reset email sent! Please check your inbox and follow the instructions.';
        document.getElementById('email').value = '';
        document.querySelector('.reset-card').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error('Error:', err);
        loadingMessage.style.display = 'none';
        submitBtn.style.display = 'block';
        submitBtn.disabled = false;
        alert('Failed to send email. Please try again later.');
    }
});

// Real-time email validation (unchanged)
document.getElementById('email').addEventListener('input', function () {
    const emailError = document.getElementById('emailError');
    const email = this.value;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.style.display = 'block';
    } else {
        emailError.style.display = 'none';
    }
});

//  //----------Harsh
 
//  const resetBtn = document.getElementById('submitBtn');
//         resetBtn.addEventListener('click', ()=>{
//             const email = document.getElementById('email').value;
//             fetch('/api/forget-password', {
//                 method: 'POST',
//                  headers:{
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ email })

//             }).then(response => response.json())
//             .then(data => {
//                 const successMessage = document.getElementById('successMessage');
//                 successMessage.style.display = 'block';
//                 if(!data.message){
//                     successMessage.innerText = "This Email is not Found !!"
//                 }else{
//                     successMessage.innerText = "Password reset email sent!!! Please check your inbox and follow the instructions."
//                 }
//                 console.log(data.message);
//             })
//             .catch(err=>{
//                 console.error("Error:", err);
//                 alert("Failed to send email. Please try again later.");
//             })
//         })

//          document.getElementById('resetForm').addEventListener('submit', function(e) {
//             e.preventDefault();
            
//             const submitBtn = document.getElementById('submitBtn');
//             const loadingMessage = document.getElementById('loadingMessage');
//             const successMessage = document.getElementById('successMessage');
//             const emailError = document.getElementById('emailError');
//             const email = document.getElementById('email').value;

//             // Hide previous messages
//             emailError.style.display = 'none';
//             successMessage.style.display = 'none';

//             // Basic email validation
//             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//             if (!emailRegex.test(email)) {
//                 emailError.textContent = 'Please enter a valid email address';
//                 emailError.style.display = 'block';
//                 return;
//             }

//             // Show loading state
//             submitBtn.disabled = true;
//             submitBtn.style.display = 'none';
//             loadingMessage.style.display = 'block';

//             // Simulate API call
//             setTimeout(() => {
//                 // Hide loading
//                 loadingMessage.style.display = 'none';
//                 submitBtn.style.display = 'block';
//                 submitBtn.disabled = false;

//                 // Show success message
//                 successMessage.style.display = 'block';
                
//                 // Clear form
//                 document.getElementById('email').value = '';
                
//                 // Scroll to top to show success message
//                 document.querySelector('.reset-card').scrollIntoView({ behavior: 'smooth' });
//             }, 4000);
//         });

//         // Real-time email validation
//         document.getElementById('email').addEventListener('input', function() {
//             const emailError = document.getElementById('emailError');
//             const email = this.value;
            
//             if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//                 emailError.textContent = 'Please enter a valid email address';
//                 emailError.style.display = 'block';
//             } else {
//                 emailError.style.display = 'none';
//             }
//         });