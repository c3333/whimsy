#!/usr/bin/ruby

module Angular::AsfRosterServices
  # merge data from multiple sources
  class Merge
    @@committers = nil
    @@pmcs = nil
    @@info = nil
    @@ldap_groups = nil
    @@groups = {}
    @@services = nil
    @@count = 0

    def self.ldap(ldap)
      @@committers = ldap.committers
      @@pmcs = ldap.pmcs
      @@services = ldap.services
      @@ldap_groups = ldap.groups
      self.merge()
    end

    def self.info(info)
      @@info = info
      self.merge()
    end

    def self.merge()
      @@count += 1
      return unless @@committers
      if @@info
        committers = @@committers

        # add chair to each pmc
        for pmc in @@info
          next unless @@pmcs[pmc]
          @@pmcs[pmc].chair = committers[@@info[pmc].chair]
        end

        # build a list of PMC members and committers
        for name in @@pmcs
          pmc = @@pmcs[name]
          pmc.members ||= []
          pmc.members.clear()

          # extract PMC members from committee-info.txt
          if @@info[name]
            pmc.display_name = @@info[name].display_name
            @@info[name].memberUid.each do |uid|
              person = committers[uid]
              pmc.members << person if person
            end
          else
            pmc.display_name = name
          end

          # add unique PMC members from LDAP
          pmc.memberUid.each do |uid|
            person = committers[uid]
            pmc.members << person if person and not pmc.members.include? person
          end

          # extract committers from LDAP groups of the same name
          pmc.committers ||= []
          pmc.committers.clear()

          if @@ldap_groups[name]
            @@ldap_groups[name].memberUid.each do |uid|
              person = committers[uid]
              if person and not pmc.members.include? person
                pmc.committers << person
              end
            end
          end
        end

        for group in @@ldap_groups
          next if %w(committers).include? group or @@pmcs[group]
          @@ldap_groups[group].source = 'LDAP group'
          @@groups[group] = @@ldap_groups[group]
        end

        for group in @@services
          next if %w(apldap infrastructure-root).include? group
          if group == 'infrastructure'
            group  = @@services.infrastructure
            group.members ||= []
            group.members.clear()
            group.memberUid.each do |uid|
              person = committers[uid]
              group.members << person if person
            end
          else
            @@services[group].source = 'LDAP service'
            @@groups[group] = @@services[group]
          end
        end

        for group in @@info
          next if @@pmcs[group] or @@info[group].memberUid.empty?
          @@info[group].source = 'committee-info.txt'
          @@groups[group] = @@info[group]
        end

        for name in @@groups
          group = @@groups[name]
          group.link = "group/#{name}"
        end
      else
        for name in @@pmcs
          @@pmcs[name].display_name = name
        end
      end
    end

    def self.groups()
      return @@groups 
    end

    def self.count
      return @@count
    end
  end

  class LDAP
    @@fetching = false

    @@index = {
      services: {},
      committers: {},
      pmcs: {},
      groups: {},
      members: []
    }

    def self.fetch_twice(url, &update)
      if_cached = {"Cache-Control" => "only-if-cached"}
      $http.get(url, cache: false, headers: if_cached).success { |result|
        update(result)
      }.finally {
        setTimeout 0 do
          $http.get(url, cache: false).success do |result, status|
            update(result) unless status == 304
          end
        end
      }
    end

    def self.get()
      unless @@fetching
        @@fetching = true
        self.fetch_twice 'json/ldap' do |result|
          # add in links
          for group in result.groups
            result.groups[group].link = "group/#{group}"
          end

          for group in result.services
            result.services[group].link = "group/#{group}"
          end

          for pmc in result.pmcs
            result.pmcs[pmc].link = "committee/#{pmc}"
          end

          for person in result.committers
            result.committers[person].link = "committee/#{person}"
          end

          # copy to class variables
          angular.copy result.services, @@index.services
          angular.copy result.committers, @@index.committers
          angular.copy result.pmcs, @@index.pmcs
          angular.copy result.groups, @@index.groups
          angular.copy result.groups.member.memberUid, @@index.members

          # merge with other sources
          Merge.ldap(@@index)
        end
      end

      return @@index
    end

    def self.committers
      return self.get().committers
    end

    def self.members
      return self.get().members
    end

    def self.services
      return self.get().services
    end

    def self.pmcs
      return self.get().pmcs
    end

    def self.groups
      return self.get().groups
    end
  end

  class INFO
    @@info = {}

    def self.get(name)
      unless @@fetching
        @@fetching = true
        $http.get('json/info').success do |result|
          for pmc in result
            result[pmc].cn = pmc
          end

          angular.copy result, @@info
          Merge.info(@@info)
        end
      end

      if name
        return @@info[name]
      else
        return @@info
      end
    end
  end
end
