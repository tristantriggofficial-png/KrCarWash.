document.addEventListener('DOMContentLoaded', function() {
  var btns = document.querySelectorAll('.join-club-btn');
  btns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '/kr-membership-signup';
    });
  });
});
