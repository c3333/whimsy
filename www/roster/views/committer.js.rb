class Committer < React
  def render
    _h2 "#{@@committer.id}@apache.org"

    _table.wide do

      _tr do
        _td 'Name'
        _td do
          name = @@committer.name

          if name.public_name==name.legal_name and name.public_name==name.ldap
            _span @@committer.name.public_name
          else
            _ul do
              _li "#{@@committer.name.public_name} (public name)"

              if name.legal_name and name.legal_name != name.public_name
                _li "#{@@committer.name.legal_name} (legal name)"
              end

              if name.ldap and name.ldap != name.public_name
                _li "#{@@committer.name.ldap} (ldap)"
              end
            end
          end
        end
      end

      if @@committer.urls
        _tr do
          _td 'Personal URL'
          _td do
            _ul @@committer.urls do |url|
              _a url, href: url
            end
          end
        end
      end

      unless @@committer.committees.empty?
	_tr do
	  _td 'Committees'
	  _td do
	    _ul @@committer.committees do |pmc|
	      _li {_a pmc, href: "committee/#{pmc}"}
	    end
	  end
	end
      end

      unless @@committer.committer.empty?
	_tr do
	  _td 'Committer'
	  _td do
	    _ul @@committer.committer do |pmc|
	      _li {_a pmc, href: "committee/#{pmc}"}
	    end
	  end
	end
      end

      if false # not ready yet
	_tr do
	  _td 'Groups'
	  _td do
	    _ul @@committer.groups do |pmc|
	      next if @@committer.committees.include? pmc
	      _li {_a pmc, href: "committee/#{pmc}"}
	    end
	  end
	end
      end

      if @@committer.member
        if @@committer.member.status
          _tr do
            _td 'Member status'
            _td @@committer.member.status
          end
        end

        if @@committer.member.info
          _tr do
            _td 'Members.txt'
            _td {_pre @@committer.member.info}
          end
        end

        if @@committer.member.nomination
          _tr do
            _td 'nomination'
            _td {_pre @@committer.member.nomination}
          end
        end
      end
    end
  end
end
